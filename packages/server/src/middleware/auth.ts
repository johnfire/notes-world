import { Request, Response, NextFunction } from "express";
import { createHash } from "crypto";
import { verifyAccessToken } from "../domains/auth/auth.service";
import {
  findApiKeyByHash,
  findUserById,
} from "../domains/auth/auth.repository";
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
        // API keys have no expiry; disabling the account must revoke them.
        if (row.disabled)
          return next(new AuthorizationError("Account is disabled"));
        req.userId = row.user_id;
        next();
      })
      .catch(next);
    return;
  }

  // Verify the signature synchronously (throws → Express error handler), then
  // confirm the account is still enabled. An access token outlives a disable
  // action by up to its TTL, so re-check on every request.
  const payload = verifyAccessToken(token);
  findUserById(payload.sub)
    .then((user) => {
      if (!user || user.disabled)
        return next(new AuthorizationError("Account is disabled"));
      req.userId = payload.sub;
      next();
    })
    .catch(next);
}
