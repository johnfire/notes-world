// Bug reports domain — request/result types

export interface SubmitBugReportInput {
  description: string;
  page?: string;
  userAgent?: string;
}

export interface BugReportContext {
  reporterEmail: string;
  reporterUserId: string;
  page?: string;
  userAgent?: string;
  appVersion: string;
  timestamp: string;
}

export interface CreatedBugReport {
  number: number;
  url: string;
}
