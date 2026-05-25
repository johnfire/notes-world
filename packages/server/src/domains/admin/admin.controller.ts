import { Request, Response } from "express";
import { wrapAsync } from "../../utils/wrapAsync";
import * as authRepo from "../auth/auth.repository";
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
