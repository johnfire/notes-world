// Client-errors domain — request/result types

export interface ClientErrorReport {
  /** Which client sent it, e.g. "web" | "android". */
  app: string;
  message: string;
  appVersion?: string;
  platform?: string;
  /** Screen/route/component where it happened. */
  context?: string;
  /** Page URL (web). */
  url?: string;
  userAgent?: string;
  stack?: string;
  /** Set if the request carried a valid auth token. */
  userId?: string;
}
