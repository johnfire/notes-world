# Stripe Payments — Design Spec

**Date:** 2026-06-01  
**Status:** Approved

## Summary

Wire up Stripe billing so users can subscribe to Notes World Pro (€3/month or €30/year) with a 14-day free trial. The backend billing system, DB schema, and frontend upgrade flow are already fully implemented. This spec covers the remaining work: price updates, Stripe dashboard setup, and server env configuration.

## Pricing

| Plan | Price                | Notes                                               |
| ---- | -------------------- | --------------------------------------------------- |
| Free | €0                   | Unlimited notes, tasks, ideas; up to 20 tags        |
| Pro  | €3/month or €30/year | Unlimited tags, priority support, 14-day free trial |

Annual saves 2 months vs monthly (€36/year → €30/year).

## What's Already Built

- **Backend** (`packages/server/src/domains/billing/`): checkout session creation (monthly + annual), customer portal redirect, webhook handler for `customer.subscription.created/updated/deleted`, coupon validation
- **Frontend** (`packages/web/src/pages/UpgradePage.tsx`): plan selection modal (monthly + annual cards), coupon input, 14-day trial callout
- **DB** (migrations `013_billing.sql`, `014_coupons.sql`): `role`, `stripe_customer_id`, `stripe_subscription_id`, `stripe_subscription_status`, `trial_ends_at` on users; `coupons` table
- **Feature gate**: 20-tag limit enforced server-side for `role = 'free'` users
- **Roles**: `free`, `gift`, `paid`, `admin` — webhook sets role to `paid` on active/trialing subscription, reverts to `free` on cancellation/deletion

## Code Changes Required

### 1. Update prices in `en.json` and all 25 locale files

```json
"pro": {
  "price": "€3",
  "period": "/ month",
  "alt": "or €30 / year — 2 months free"
}
```

### 2. Update `UpgradePage.tsx` display

- Monthly card: €3 (was €5)
- Annual card: €30 (was €45)
- Annual badge: "2 months free" (was "Save 25%")
- Body copy: `or €30 / year — 2 months free`

### 3. Update `.env.example`

Add Stripe env vars with comments:

```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_PRICE_MONTHLY_ID=price_...
STRIPE_PRICE_ANNUAL_ID=price_...
STRIPE_WEBHOOK_SECRET=whsec_...
APP_URL=https://notes-world.christopherrehm.de
```

## Stripe Dashboard Setup (Manual Steps)

1. **Create Product**: Name = "Notes World Pro"
2. **Create Monthly Price**: €3.00 / month recurring → copy Price ID → `STRIPE_PRICE_MONTHLY_ID`
3. **Create Annual Price**: €30.00 / year recurring → copy Price ID → `STRIPE_PRICE_ANNUAL_ID`
4. **Register Webhook**: Endpoint = `https://notes-world.christopherrehm.de/api/billing/webhook`
   - Events: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
   - Copy signing secret → `STRIPE_WEBHOOK_SECRET`
5. **Copy API keys**: Dashboard → Developers → API keys → `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`

## Server Env Vars to Set

SSH into `chris@82.165.32.162`, edit `/opt/notes-world/.env`, add:

```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PRICE_MONTHLY_ID=price_...
STRIPE_PRICE_ANNUAL_ID=price_...
STRIPE_WEBHOOK_SECRET=whsec_...
APP_URL=https://notes-world.christopherrehm.de
```

Then restart: `sudo docker compose up -d app`

## Domain Switch Notes

When moving to a new domain:

1. Register new webhook URL in Stripe dashboard → get new `STRIPE_WEBHOOK_SECRET`
2. Update `STRIPE_WEBHOOK_SECRET` and `APP_URL` in server `.env`
3. No code changes required — redirect URLs are built dynamically from `APP_URL`

## Trial Behaviour

- 14-day free trial on every new Pro subscription (configured in `billing.service.ts`)
- Trial users get `role = 'paid'` and `stripe_subscription_status = 'trialing'`
- On trial end, Stripe auto-charges; on failure, status becomes `past_due` and role reverts to `free`

## Out of Scope

- Coupon system: already built and has a launch coupon (`onebukk`). No changes needed.
- Admin role management: already works via admin panel.
- Mobile app billing: not in scope for this phase.
