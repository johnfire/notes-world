// Bug reports domain — builds and files a GitHub issue from a user report
import { AppError, NotFoundError } from "../../utils/errors";
import { findUserById } from "../auth/auth.repository";
import {
  SubmitBugReportInput,
  BugReportContext,
  CreatedBugReport,
} from "./bug-reports.types";

const DEFAULT_REPO = "johnfire/notes-world";
const APP_VERSION = process.env.npm_package_version ?? "0.1.0";

function deriveTitle(description: string): string {
  const firstLine = description.split("\n")[0].trim();
  const base =
    firstLine.length > 70 ? `${firstLine.slice(0, 67)}...` : firstLine;
  return `[Bug] ${base}`;
}

export function buildIssueBody(
  description: string,
  ctx: BugReportContext,
): string {
  const lines = [
    description.trim(),
    "",
    "---",
    "### Report context",
    `- **Reported by:** ${ctx.reporterEmail} (\`${ctx.reporterUserId}\`)`,
    `- **Page:** ${ctx.page ?? "(not provided)"}`,
    `- **User agent:** ${ctx.userAgent ?? "(not provided)"}`,
    `- **App version:** ${ctx.appVersion}`,
    `- **Reported at:** ${ctx.timestamp}`,
  ];
  return lines.join("\n");
}

export async function submitBugReport(
  userId: string,
  input: SubmitBugReportInput,
): Promise<CreatedBugReport> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new AppError(
      "Bug reporting is not configured",
      "BUG_REPORTING_NOT_CONFIGURED",
      503,
    );
  }
  const repo = process.env.GITHUB_REPO ?? DEFAULT_REPO;

  const user = await findUserById(userId);
  if (!user) throw new NotFoundError("User", userId);

  const ctx: BugReportContext = {
    reporterEmail: user.email,
    reporterUserId: userId,
    page: input.page,
    userAgent: input.userAgent,
    appVersion: APP_VERSION,
    timestamp: new Date().toISOString(),
  };

  const payload = {
    title: deriveTitle(input.description),
    body: buildIssueBody(input.description, ctx),
    labels: ["bug", "user-reported"],
  };

  let res: Response;
  try {
    res = await fetch(`https://api.github.com/repos/${repo}/issues`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
        "User-Agent": "notes-world-bug-reporter",
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new AppError("Failed to reach GitHub", "GITHUB_API_ERROR", 502);
  }

  if (!res.ok) {
    throw new AppError(
      `GitHub rejected the issue (status ${res.status})`,
      "GITHUB_API_ERROR",
      502,
    );
  }

  const issue = (await res.json()) as { number: number; html_url: string };
  return { number: issue.number, url: issue.html_url };
}
