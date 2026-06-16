import { api } from "./client";

export function submitBugReport(data: {
  description: string;
  page?: string;
  userAgent?: string;
}): Promise<{ number: number; url: string }> {
  return api.post<{ number: number; url: string }>("/bug-reports", data);
}
