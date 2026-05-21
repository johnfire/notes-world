import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../domains/auth/auth.service";
import { AuthorizationError } from "../utils/errors";

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw new AuthorizationError("Authorization header required");
  }
  const token = header.slice(7);
  const payload = verifyAccessToken(token);
  req.userId = payload.sub;
  next();
}
