import { RequestHandler } from "express";
import crypto from "crypto";
import { verifyMcpAccessToken } from "./tokens";

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

// Gate every /mcp request. Unlike the notes-world MCP (which forwards the key to
// a downstream API), this server holds the IMAP credential itself, so it simply
// checks the caller presented the one configured key — directly or via a JWT.
export function createMcpAuthMiddleware(expectedApiKey: string): RequestHandler {
  return (req, res, next) => {
    const raw =
      (req.headers["x-api-key"] as string | undefined) ??
      req.headers.authorization?.replace(/^Bearer\s+/i, "");

    if (!raw) {
      res.status(401).json({ error: "API key required" });
      return;
    }

    // Direct key — kept for local dev and CLI.
    if (safeEqual(raw, expectedApiKey)) {
      next();
      return;
    }

    // OAuth JWT access token.
    const payload = verifyMcpAccessToken(raw);
    if (payload && safeEqual(payload.api_key, expectedApiKey)) {
      next();
      return;
    }

    res.status(401).json({ error: "Invalid or expired token" });
  };
}
