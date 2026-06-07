import { RequestHandler } from "express";
import { requestKeyStore } from "../api";
import { verifyMcpAccessToken } from "./tokens";

export function createMcpAuthMiddleware(): RequestHandler {
  return (req, res, next) => {
    const raw =
      (req.headers["x-api-key"] as string | undefined) ??
      req.headers.authorization?.replace(/^Bearer\s+/i, "");

    if (!raw) {
      res.status(401).json({ error: "API key required" });
      return;
    }

    // Direct nw_ key — kept for local dev and CLI
    if (raw.startsWith("nw_")) {
      requestKeyStore.run(raw, next);
      return;
    }

    // OAuth JWT access token
    const payload = verifyMcpAccessToken(raw);
    if (payload) {
      requestKeyStore.run(payload.nw_key, next);
      return;
    }

    res.status(401).json({ error: "Invalid or expired token" });
  };
}
