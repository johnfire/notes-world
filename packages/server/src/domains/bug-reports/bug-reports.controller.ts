import { Request, Response } from "express";
import { LIMITS } from "../../constants";
import { ValidationError } from "../../utils/errors";
import { wrapAsync } from "../../utils/wrapAsync";
import * as service from "./bug-reports.service";

function clampString(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, max);
}

export const submitBugReport = wrapAsync(
  async (req: Request, res: Response) => {
    const description =
      typeof req.body.description === "string"
        ? req.body.description.trim()
        : "";
    if (!description) {
      throw new ValidationError("description is required");
    }
    if (description.length > LIMITS.BUG_REPORT_DESC_MAX) {
      throw new ValidationError(
        `description must be at most ${LIMITS.BUG_REPORT_DESC_MAX} characters`,
      );
    }

    const result = await service.submitBugReport(req.userId, {
      description: description.slice(0, LIMITS.BUG_REPORT_DESC_MAX),
      page: clampString(req.body.page, LIMITS.BUG_REPORT_PAGE_MAX),
      userAgent: clampString(req.body.userAgent, LIMITS.BUG_REPORT_UA_MAX),
    });

    res.status(201).json(result);
  },
);
