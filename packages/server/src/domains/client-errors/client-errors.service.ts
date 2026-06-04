import { logger } from "../../utils/logger";
import { ClientErrorReport } from "./client-errors.types";

/**
 * Records a client-side error to the master log so web/Android failures are
 * visible and fixable server-side. Logging only (no DB table) for now.
 */
export function recordClientError(report: ClientErrorReport): void {
  logger.error("client-error", {
    app: report.app,
    appVersion: report.appVersion,
    platform: report.platform,
    context: report.context,
    url: report.url,
    userAgent: report.userAgent,
    userId: report.userId,
    clientMessage: report.message,
    stack: report.stack,
  });
}
