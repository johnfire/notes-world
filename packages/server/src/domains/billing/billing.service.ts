import Stripe from "stripe";
import * as repo from "../auth/auth.repository";
import { query, queryOne } from "../../db/client";
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

type CouponRow = {
  stripe_coupon_id: string;
  description: string;
};

export async function validateCoupon(
  code: string,
): Promise<{ valid: boolean; description: string }> {
  const row = await queryOne<CouponRow>(
    "SELECT stripe_coupon_id, description FROM coupons WHERE code = $1 AND active = true",
    [code.toLowerCase().trim()],
  );
  if (!row || !row.stripe_coupon_id) return { valid: false, description: "" };
  return { valid: true, description: row.description };
}

export async function createCheckoutSession(
  user: User,
  plan: "monthly" | "annual",
  couponCode?: string,
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

  let stripeCouponId: string | undefined;
  if (couponCode) {
    const row = await queryOne<CouponRow>(
      "SELECT stripe_coupon_id FROM coupons WHERE code = $1 AND active = true",
      [couponCode.toLowerCase().trim()],
    );
    if (row?.stripe_coupon_id) stripeCouponId = row.stripe_coupon_id;
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: { trial_period_days: 14 },
    success_url: `${APP_URL}/?billing=success`,
    cancel_url: `${APP_URL}/?billing=cancelled`,
    allow_promotion_codes: !stripeCouponId,
    ...(stripeCouponId ? { discounts: [{ coupon: stripeCouponId }] } : {}),
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

// Billing only governs the free <-> paid entitlement. Privileged roles
// (admin, gift) must never be overwritten by a subscription event — otherwise
// a past-due/cancelled webhook would silently de-admin a user.
const BILLING_MANAGED_ROLES = ["free", "paid"];
export function billingRole(currentRole: string, isActive: boolean): string {
  if (!BILLING_MANAGED_ROLES.includes(currentRole)) return currentRole;
  return isActive ? "paid" : "free";
}

export async function handleWebhook(
  payload: Buffer,
  sig: string,
): Promise<void> {
  const stripe = getStripe();
  // Billing disabled entirely (no Stripe key) — nothing to do.
  if (!stripe) return;
  // Stripe IS configured but the signing secret is missing: fail loudly rather
  // than silently accepting unverifiable webhooks.
  if (!WEBHOOK_SECRET) {
    throw new Error("Stripe webhook secret not configured");
  }

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
        role: billingRole(user.role, isActive),
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
        role: billingRole(user.role, false),
        trial_ends_at: null,
      });
      break;
    }
  }
}
