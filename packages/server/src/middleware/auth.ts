import { Request, Response, NextFunction } from "express";
import { createHash } from "crypto";
import { verifyAccessToken } from "../domains/auth/auth.service";
import { findApiKeyByHash } from "../domains/auth/auth.repository";
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

  if (token.startsWith("nw_")) {
    const hash = createHash("sha256").update(token).digest("hex");
    findApiKeyByHash(hash)
      .then((row) => {
        if (!row) return next(new AuthorizationError("Invalid API key"));
        req.userId = row.user_id;
        next();
      })
      .catch(next);
    return;
  }

  const payload = verifyAccessToken(token);
  req.userId = payload.sub;
  next();
}
