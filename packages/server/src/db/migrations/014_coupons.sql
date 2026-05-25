CREATE TABLE IF NOT EXISTS coupons (
  code            TEXT PRIMARY KEY,
  stripe_coupon_id TEXT NOT NULL DEFAULT '',
  description     TEXT NOT NULL,
  active          BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Update stripe_coupon_id after creating the coupon in the Stripe dashboard:
--   Stripe Dashboard → Coupons → Create: amount_off=400, currency=eur, duration=once
--   Then: UPDATE coupons SET stripe_coupon_id = 'STRIPE_COUPON_ID' WHERE code = 'onebukk';
INSERT INTO coupons (code, stripe_coupon_id, description)
VALUES ('onebukk', '', 'Special launch price — €1 first month')
ON CONFLICT (code) DO NOTHING;
