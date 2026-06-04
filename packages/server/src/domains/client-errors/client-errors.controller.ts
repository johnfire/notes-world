import { Request, Response } from "express";
import { LIMITS } from "../../constants";
import { ValidationError } from "../../utils/errors";
import { wrapAsync } from "../../utils/wrapAsync";
import * as service from "./client-errors.service";

function clampString(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, max);
}

export const reportClientError = wrapAsync(
  async (req: Request, res: Response) => {
    const message = clampString(req.body.message, LIMITS.CLIENT_ERROR_MSG_MAX);
    if (!message) {
      throw new ValidationError("message is required");
    }

    service.recordClientError({
      app:
        clampString(req.body.app, LIMITS.CLIENT_ERROR_SHORT_MAX) ?? "unknown",
      message,
      appVersion: clampString(
        req.body.appVersion,
        LIMITS.CLIENT_ERROR_SHORT_MAX,
      ),
      platform: clampString(req.body.platform, LIMITS.CLIENT_ERROR_SHORT_MAX),
      context: clampString(req.body.context, LIMITS.CLIENT_ERROR_CONTEXT_MAX),
      url: clampString(req.body.url, LIMITS.CLIENT_ERROR_CONTEXT_MAX),
      userAgent: clampString(req.body.userAgent, LIMITS.CLIENT_ERROR_UA_MAX),
      stack: clampString(req.body.stack, LIMITS.CLIENT_ERROR_STACK_MAX),
      // Set opportunistically — this route is public, so it's usually undefined.
      userId: req.userId,
    });

    res.status(202).json({ status: "accepted" });
  },
);
