import { Request, Response } from "express";
import { wrapAsync } from "../../utils/wrapAsync";
import * as authRepo from "../auth/auth.repository";
import { query, queryOne } from "../../db/client";
import { AuthorizationError, ValidationError } from "../../utils/errors";

const VALID_ROLES = ["free", "gift", "paid", "admin"];

export const listUsers = wrapAsync(async (_req: Request, res: Response) => {
  const users = await authRepo.listAllUsers();
  res.json(users);
});

export const updateUserRole = wrapAsync(async (req: Request, res: Response) => {
  const { role } = req.body;
  if (!VALID_ROLES.includes(role)) {
    throw new ValidationError(
      `Invalid role. Must be one of: ${VALID_ROLES.join(", ")}`,
    );
  }
  const user = await authRepo.updateUserRole(req.params.id, role);
  if (!user) throw new AuthorizationError("User not found");
  res.json(user);
});

// ── Coupons ───────────────────────────────────────────────────────────────────

export const listCoupons = wrapAsync(async (_req: Request, res: Response) => {
  const rows = await query(
    "SELECT code, stripe_coupon_id, description, active, created_at FROM coupons ORDER BY created_at DESC",
  );
  res.json(rows);
});

export const createCoupon = wrapAsync(async (req: Request, res: Response) => {
  const { code, stripe_coupon_id, description } = req.body as Record<
    string,
    unknown
  >;
  if (
    typeof code !== "string" ||
    !code.trim() ||
    typeof stripe_coupon_id !== "string" ||
    typeof description !== "string" ||
    !description.trim()
  ) {
    throw new ValidationError(
      "code, stripe_coupon_id, and description are required",
    );
  }
  const row = await queryOne(
    `INSERT INTO coupons (code, stripe_coupon_id, description)
     VALUES ($1, $2, $3)
     RETURNING code, stripe_coupon_id, description, active, created_at`,
    [code.toLowerCase().trim(), stripe_coupon_id.trim(), description.trim()],
  );
  res.status(201).json(row);
});

export const updateCoupon = wrapAsync(async (req: Request, res: Response) => {
  const { code } = req.params;
  const { stripe_coupon_id, description, active } = req.body as Record<
    string,
    unknown
  >;
  const row = await queryOne(
    `UPDATE coupons
     SET stripe_coupon_id = COALESCE($1, stripe_coupon_id),
         description      = COALESCE($2, description),
         active           = COALESCE($3, active)
     WHERE code = $4
     RETURNING code, stripe_coupon_id, description, active, created_at`,
    [
      typeof stripe_coupon_id === "string" ? stripe_coupon_id.trim() : null,
      typeof description === "string" ? description.trim() : null,
      typeof active === "boolean" ? active : null,
      code,
    ],
  );
  if (!row) throw new AuthorizationError("Coupon not found");
  res.json(row);
});

export const deleteCoupon = wrapAsync(async (req: Request, res: Response) => {
  await query("DELETE FROM coupons WHERE code = $1", [req.params.code]);
  res.status(204).end();
});
