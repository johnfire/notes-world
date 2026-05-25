import { Request, Response, NextFunction } from "express";
import { AuthorizationError } from "../utils/errors";
import * as authRepo from "../domains/auth/auth.repository";

export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const user = await authRepo.findUserById(req.userId!);
  if (!user || user.role !== "admin") {
    throw new AuthorizationError("Admin access required");
  }
  next();
}
