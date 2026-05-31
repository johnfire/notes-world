import { Router } from "express";
import rateLimit from "express-rate-limit";
import * as ctrl from "./bug-reports.controller";

export const bugReportsRouter = Router();

// Tight limit on top of the global API limiter — prevent issue spam.
// Disabled under test so suites don't trip the limiter.
if (process.env.NODE_ENV !== "test") {
  bugReportsRouter.use(
    rateLimit({
      windowMs: 10 * 60_000,
      limit: 5,
      standardHeaders: "draft-7",
      legacyHeaders: false,
      message: {
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message: "Too many bug reports, please try again later",
        },
      },
    }),
  );
}

bugReportsRouter.post("/", ctrl.submitBugReport);
