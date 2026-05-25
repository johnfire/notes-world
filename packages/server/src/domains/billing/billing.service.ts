import Stripe from "stripe";
import * as repo from "../auth/auth.repository";
import { User } from "../../types";

type StripeClient = InstanceType<typeof Stripe>;

function getStripe(): StripeClient | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

const MONTHLY_PRICE_ID = process.env.STRIPE_PRICE_MONTHLY_ID ?? "";
const ANNUAL_PRICE_ID = process.env.STRIPE_PRICE_ANNUAL_ID ?? "";
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? "";
const APP_URL = process.env.APP_URL ?? "https://notes-world.christopherrehm.de";

type FullUser = User & { stripe_customer_id?: string | null };

export async function createCheckoutSession(
  user: User,
  plan: "monthly" | "annual",
): Promise<string> {
  const stripe = getStripe();
  if (!stripe) throw new Error("Stripe is not configured");

  const priceId = plan === "annual" ? ANNUAL_PRICE_ID : MONTHLY_PRICE_ID;
  if (!priceId) throw new Error(`Price ID for ${plan} plan is not configured`);

  const full = (await repo.findUserByIdFull(user.id)) as FullUser | null;
  let customerId = full?.stripe_customer_id ?? undefined;

  if (!customerId) {
    const customer = await stripe.customers.create({ email: user.email });
    customerId = customer.id;
    await repo.updateUserStripe(user.id, { stripe_customer_id: customerId });
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: { trial_period_days: 14 },
    success_url: `${APP_URL}/?billing=success`,
    cancel_url: `${APP_URL}/?billing=cancelled`,
    allow_promotion_codes: true,
  });

  return session.url!;
}

export async function createPortalSession(user: User): Promise<string> {
  const stripe = getStripe();
  if (!stripe) throw new Error("Stripe is not configured");

  const full = (await repo.findUserByIdFull(user.id)) as FullUser | null;
  const customerId = full?.stripe_customer_id;
  if (!customerId) throw new Error("No billing account found");

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${APP_URL}/`,
  });

  return session.url;
}

type SubLike = {
  id: string;
  status: string;
  customer: string | { id: string };
  trial_end: number | null;
};

export async function handleWebhook(
  payload: Buffer,
  sig: string,
): Promise<void> {
  const stripe = getStripe();
  if (!stripe || !WEBHOOK_SECRET) return;

  let event: { type: string; data: { object: unknown } };
  try {
    event = stripe.webhooks.constructEvent(payload, sig, WEBHOOK_SECRET) as {
      type: string;
      data: { object: unknown };
    };
  } catch {
    throw new Error("Webhook signature verification failed");
  }

  const sub = event.data.object as SubLike;

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const customerId =
        typeof sub.customer === "string" ? sub.customer : sub.customer.id;
      const user = await repo.findUserByStripeCustomerId(customerId);
      if (!user) break;
      const isActive = ["active", "trialing"].includes(sub.status);
      await repo.updateUserStripe(user.id, {
        stripe_subscription_id: sub.id,
        stripe_subscription_status: sub.status,
        role: isActive ? "paid" : "free",
        trial_ends_at: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
      });
      break;
    }
    case "customer.subscription.deleted": {
      const customerId =
        typeof sub.customer === "string" ? sub.customer : sub.customer.id;
      const user = await repo.findUserByStripeCustomerId(customerId);
      if (!user) break;
      await repo.updateUserStripe(user.id, {
        stripe_subscription_id: null,
        stripe_subscription_status: "cancelled",
        role: "free",
        trial_ends_at: null,
      });
      break;
    }
  }
}
