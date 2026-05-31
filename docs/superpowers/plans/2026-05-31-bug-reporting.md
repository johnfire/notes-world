# Bug Reporting Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let any logged-in user report a bug from the web app; the server files it as a GitHub issue in `johnfire/notes-world` for the maintainer to triage.

**Architecture:** A new server domain `bug-reports` exposes `POST /api/bug-reports` (auth + tight rate limit). The controller validates input; the service looks up the reporter's email, builds a markdown issue body with context (reporter, page, user-agent, app version, timestamp), and creates the issue via the GitHub REST API using Node's global `fetch`. The web app adds a floating "Report a bug" button + modal shown on authenticated pages.

**Tech Stack:** TypeScript, Express, Node 20 global `fetch`, React 18 + Tailwind, Jest + supertest (server tests), Vitest + Testing Library (web tests), express-rate-limit.

**Spec:** `docs/superpowers/specs/2026-05-31-bug-reporting-design.md`

**Deviations from spec (deliberate, for minimalism / codebase consistency):**

- Config is read via `process.env.GITHUB_TOKEN` / `process.env.GITHUB_REPO` directly in the service (matches `auth.service.ts` reading `process.env.JWT_SECRET`), instead of adding fields to `config/env.ts`.
- No i18n for the modal — the nearest sibling (`ImportModal.tsx`) uses plain English strings, so we match it.
- Validation errors return **422** (the codebase's `ValidationError` convention), not 400 as the spec table loosely stated.

---

## File Structure

**Server (create):**

- `packages/server/src/domains/bug-reports/bug-reports.types.ts` — request/result types.
- `packages/server/src/domains/bug-reports/bug-reports.service.ts` — `buildIssueBody()` (pure) + `submitBugReport()` (email lookup + GitHub API call).
- `packages/server/src/domains/bug-reports/bug-reports.controller.ts` — validation + handler.
- `packages/server/src/domains/bug-reports/bug-reports.routes.ts` — router + per-route rate limiter.
- `tests/unit/server/domains/bug-reports/bug-reports.service.test.ts` — service unit tests (mock auth repo + global fetch).
- `tests/contract/server/domains/bug-reports/bug-reports.routes.test.ts` — route contract tests (supertest).

**Server (modify):**

- `packages/server/src/constants/index.ts` — add `BUG_REPORT` limits.
- `packages/server/src/app.ts` — import + mount the router.

**Web (create):**

- `packages/web/src/components/BugReportButton.tsx` — floating button + modal.
- `packages/web/src/components/BugReportButton.test.tsx` — component test.

**Web (modify):**

- `packages/web/src/api/index.ts` — add `bugReports` client.
- `packages/web/src/App.tsx` — render `<BugReportButton />` inside the authenticated shell.

**Docs (modify):**

- `docs/deployment.md` — `GITHUB_TOKEN` env var + label setup.

---

## Task 1: Server constants

**Files:**

- Modify: `packages/server/src/constants/index.ts`

- [ ] **Step 1: Add bug-report limits to the `LIMITS` object**

In `packages/server/src/constants/index.ts`, add these three keys inside the existing `LIMITS` object (after `IMPORT_BATCH_MAX: 500,`):

```typescript
  BUG_REPORT_DESC_MAX: 5_000,
  BUG_REPORT_PAGE_MAX: 200,
  BUG_REPORT_UA_MAX: 500,
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run build --workspace=packages/server`
Expected: build succeeds (no TS errors).

- [ ] **Step 3: Commit**

```bash
git add packages/server/src/constants/index.ts
git commit -m "feat(server): add bug-report input limits"
```

---

## Task 2: Server domain types

**Files:**

- Create: `packages/server/src/domains/bug-reports/bug-reports.types.ts`

- [ ] **Step 1: Create the types file**

Create `packages/server/src/domains/bug-reports/bug-reports.types.ts` with exactly:

```typescript
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
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run build --workspace=packages/server`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add packages/server/src/domains/bug-reports/bug-reports.types.ts
git commit -m "feat(server): add bug-reports domain types"
```

---

## Task 3: Server service

**Files:**

- Create: `packages/server/src/domains/bug-reports/bug-reports.service.ts`

Notes for the engineer:

- `findUserById(id)` lives in `packages/server/src/domains/auth/auth.repository.ts` and returns `{ id, email, ... } | null`.
- `AppError(message, code, httpStatus)` is exported from `packages/server/src/utils/errors.ts`. Use it directly for the 503/502 cases (there is no dedicated 503 class). `NotFoundError(resource, id)` is also exported there (→ 404).
- The app version is read from `process.env.npm_package_version` with a `"0.1.0"` fallback (matches `VERSION` in `app.ts`).
- Node 20 provides global `fetch` — do not import anything for it.

- [ ] **Step 1: Create the service file**

Create `packages/server/src/domains/bug-reports/bug-reports.service.ts` with exactly:

```typescript
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
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run build --workspace=packages/server`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add packages/server/src/domains/bug-reports/bug-reports.service.ts
git commit -m "feat(server): add bug-reports service (GitHub issue creation)"
```

---

## Task 4: Server service unit tests (Jest)

**Files:**

- Create: `tests/unit/server/domains/bug-reports/bug-reports.service.test.ts`

Notes: server tests live at the repo root under `tests/unit/server/...` and import from `packages/server/src/...` with relative paths (five `../`). Mock the auth repository and `global.fetch`.

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/server/domains/bug-reports/bug-reports.service.test.ts` with exactly:

```typescript
import { TEST_USER_ID } from "../../../../helpers/itemFactory";

jest.mock("../../../../../packages/server/src/domains/auth/auth.repository");

import * as authRepo from "../../../../../packages/server/src/domains/auth/auth.repository";
import {
  buildIssueBody,
  submitBugReport,
} from "../../../../../packages/server/src/domains/bug-reports/bug-reports.service";

const mockAuthRepo = authRepo as jest.Mocked<typeof authRepo>;

const OLD_ENV = process.env;

beforeEach(() => {
  jest.clearAllMocks();
  process.env = {
    ...OLD_ENV,
    GITHUB_TOKEN: "test-token",
    GITHUB_REPO: "johnfire/notes-world",
  };
  mockAuthRepo.findUserById.mockResolvedValue({
    id: TEST_USER_ID,
    email: "reporter@example.com",
  } as Awaited<ReturnType<typeof authRepo.findUserById>>);
});

afterEach(() => {
  process.env = OLD_ENV;
});

describe("buildIssueBody", () => {
  test("includes description and all context fields", () => {
    const body = buildIssueBody("It broke", {
      reporterEmail: "a@b.com",
      reporterUserId: "uid-1",
      page: "/app/tasks",
      userAgent: "Mozilla/5.0",
      appVersion: "0.1.0",
      timestamp: "2026-05-31T00:00:00.000Z",
    });
    expect(body).toContain("It broke");
    expect(body).toContain("a@b.com");
    expect(body).toContain("uid-1");
    expect(body).toContain("/app/tasks");
    expect(body).toContain("Mozilla/5.0");
    expect(body).toContain("0.1.0");
    expect(body).toContain("2026-05-31T00:00:00.000Z");
  });
});

describe("submitBugReport", () => {
  test("posts to GitHub and returns issue number + url", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        number: 99,
        html_url: "https://github.com/johnfire/notes-world/issues/99",
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await submitBugReport(TEST_USER_ID, {
      description: "Save button does nothing",
      page: "/app",
      userAgent: "UA",
    });

    expect(result).toEqual({
      number: 99,
      url: "https://github.com/johnfire/notes-world/issues/99",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe(
      "https://api.github.com/repos/johnfire/notes-world/issues",
    );
    const sent = JSON.parse((opts as RequestInit).body as string);
    expect(sent.title).toBe("[Bug] Save button does nothing");
    expect(sent.labels).toEqual(["bug", "user-reported"]);
    expect(sent.body).toContain("reporter@example.com");
  });

  test("throws 503 when GITHUB_TOKEN is missing", async () => {
    delete process.env.GITHUB_TOKEN;
    await expect(
      submitBugReport(TEST_USER_ID, { description: "x" }),
    ).rejects.toMatchObject({
      httpStatus: 503,
      code: "BUG_REPORTING_NOT_CONFIGURED",
    });
  });

  test("throws 502 when GitHub returns an error status", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue({ ok: false, status: 422 }) as unknown as typeof fetch;
    await expect(
      submitBugReport(TEST_USER_ID, { description: "x" }),
    ).rejects.toMatchObject({ httpStatus: 502, code: "GITHUB_API_ERROR" });
  });

  test("throws 404 when the reporter is not found", async () => {
    mockAuthRepo.findUserById.mockResolvedValue(null);
    global.fetch = jest.fn() as unknown as typeof fetch;
    await expect(
      submitBugReport(TEST_USER_ID, { description: "x" }),
    ).rejects.toMatchObject({ httpStatus: 404 });
  });
});
```

- [ ] **Step 2: Run the tests to verify they pass**

Run: `npm test --workspace=packages/server -- bug-reports.service`
Expected: all 5 tests PASS.

- [ ] **Step 3: Commit**

```bash
git add tests/unit/server/domains/bug-reports/bug-reports.service.test.ts
git commit -m "test(server): cover bug-reports service (success + 503/502/404)"
```

---

## Task 5: Server controller

**Files:**

- Create: `packages/server/src/domains/bug-reports/bug-reports.controller.ts`

- [ ] **Step 1: Create the controller file**

Create `packages/server/src/domains/bug-reports/bug-reports.controller.ts` with exactly:

```typescript
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
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run build --workspace=packages/server`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add packages/server/src/domains/bug-reports/bug-reports.controller.ts
git commit -m "feat(server): add bug-reports controller with validation"
```

---

## Task 6: Server routes

**Files:**

- Create: `packages/server/src/domains/bug-reports/bug-reports.routes.ts`

Note: `express-rate-limit` is already a dependency (used in `app.ts`).

- [ ] **Step 1: Create the routes file**

Create `packages/server/src/domains/bug-reports/bug-reports.routes.ts` with exactly:

```typescript
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
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run build --workspace=packages/server`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add packages/server/src/domains/bug-reports/bug-reports.routes.ts
git commit -m "feat(server): add bug-reports router with rate limit"
```

---

## Task 7: Mount the router

**Files:**

- Modify: `packages/server/src/app.ts`

- [ ] **Step 1: Add the import**

In `packages/server/src/app.ts`, add this import next to the other domain router imports (after the `adminRouter` import line):

```typescript
import { bugReportsRouter } from "./domains/bug-reports/bug-reports.routes";
```

- [ ] **Step 2: Mount the router**

In `packages/server/src/app.ts`, in the block of authenticated routes (after `app.use("/api/admin", adminRouter);`), add:

```typescript
app.use("/api/bug-reports", bugReportsRouter);
```

(This is below the `app.use("/api", requireAuth);` line, so the endpoint requires a valid JWT.)

- [ ] **Step 3: Verify it compiles**

Run: `npm run build --workspace=packages/server`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add packages/server/src/app.ts
git commit -m "feat(server): mount bug-reports router at /api/bug-reports"
```

---

## Task 8: Server route contract tests (Jest + supertest)

**Files:**

- Create: `tests/contract/server/domains/bug-reports/bug-reports.routes.test.ts`

Notes: mirror `tests/contract/server/domains/items/items.routes.test.ts` — mock the service, the db client, and the auth middleware (so `req.userId` is set), then drive the real app with supertest.

- [ ] **Step 1: Write the failing tests**

Create `tests/contract/server/domains/bug-reports/bug-reports.routes.test.ts` with exactly:

```typescript
import request from "supertest";

jest.mock(
  "../../../../../packages/server/src/domains/bug-reports/bug-reports.service",
);
jest.mock("../../../../../packages/server/src/db/client", () => ({
  getPool: jest.fn(),
  query: jest.fn(),
  queryOne: jest.fn(),
  withTransaction: jest.fn(),
  closePool: jest.fn(),
}));
jest.mock("../../../../../packages/server/src/middleware/auth", () => ({
  requireAuth: (
    req: import("express").Request,
    _res: import("express").Response,
    next: import("express").NextFunction,
  ) => {
    req.userId = "00000000-0000-0000-0000-000000000001";
    next();
  },
}));

import * as service from "../../../../../packages/server/src/domains/bug-reports/bug-reports.service";
import { createApp } from "../../../../../packages/server/src/app";

const mockService = service as jest.Mocked<typeof service>;
const app = createApp();

beforeEach(() => jest.clearAllMocks());

describe("POST /api/bug-reports", () => {
  test("201 with issue number + url", async () => {
    mockService.submitBugReport.mockResolvedValue({
      number: 7,
      url: "https://github.com/johnfire/notes-world/issues/7",
    });

    const res = await request(app)
      .post("/api/bug-reports")
      .send({
        description: "Save button broken",
        page: "/app",
        userAgent: "UA",
      });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      number: 7,
      url: "https://github.com/johnfire/notes-world/issues/7",
    });
    expect(mockService.submitBugReport).toHaveBeenCalledWith(
      "00000000-0000-0000-0000-000000000001",
      expect.objectContaining({
        description: "Save button broken",
        page: "/app",
        userAgent: "UA",
      }),
    );
  });

  test("422 when description is missing", async () => {
    const res = await request(app).post("/api/bug-reports").send({});
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(mockService.submitBugReport).not.toHaveBeenCalled();
  });

  test("503 when bug reporting is not configured", async () => {
    const { AppError } =
      await import("../../../../../packages/server/src/utils/errors");
    mockService.submitBugReport.mockRejectedValue(
      new AppError(
        "Bug reporting is not configured",
        "BUG_REPORTING_NOT_CONFIGURED",
        503,
      ),
    );
    const res = await request(app)
      .post("/api/bug-reports")
      .send({ description: "x" });
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe("BUG_REPORTING_NOT_CONFIGURED");
  });
});
```

- [ ] **Step 2: Run the tests to verify they pass**

Run: `npm test --workspace=packages/server -- bug-reports.routes`
Expected: all 3 tests PASS.

- [ ] **Step 3: Commit**

```bash
git add tests/contract/server/domains/bug-reports/bug-reports.routes.test.ts
git commit -m "test(server): contract tests for POST /api/bug-reports"
```

---

## Task 9: Web API client

**Files:**

- Modify: `packages/web/src/api/index.ts`

- [ ] **Step 1: Add the `bugReports` client**

At the end of `packages/web/src/api/index.ts`, append:

```typescript
// ── Bug Reports ────────────────────────────────────────────────────────────────

export const bugReports = {
  submit: (data: { description: string; page?: string; userAgent?: string }) =>
    request<{ number: number; url: string }>("/bug-reports", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run build --workspace=packages/web`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/api/index.ts
git commit -m "feat(web): add bugReports API client"
```

---

## Task 10: Web component (floating button + modal)

**Files:**

- Create: `packages/web/src/components/BugReportButton.tsx`

Notes: Follows the styling/structure of `ImportModal.tsx` (same overlay classes, `import * as api from "../api"`). The button is `fixed bottom-4 right-4`.

- [ ] **Step 1: Create the component**

Create `packages/web/src/components/BugReportButton.tsx` with exactly:

```tsx
import { useState } from "react";
import * as api from "../api";

type Status = "idle" | "submitting" | "done" | "error";

export function BugReportButton() {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [issue, setIssue] = useState<{ number: number; url: string } | null>(
    null,
  );

  function close() {
    setOpen(false);
    setDescription("");
    setStatus("idle");
    setErrorMsg("");
    setIssue(null);
  }

  async function handleSubmit() {
    if (!description.trim()) return;
    setStatus("submitting");
    setErrorMsg("");
    try {
      const result = await api.bugReports.submit({
        description: description.trim(),
        page: window.location.pathname,
        userAgent: navigator.userAgent,
      });
      setIssue(result);
      setStatus("done");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to send report");
      setStatus("error");
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Report a bug"
        className="fixed bottom-4 right-4 z-40 px-3 py-2 text-xs rounded-full bg-surface-700 border border-surface-500 text-gray-300 shadow-lg hover:bg-surface-600 hover:text-white transition-colors"
      >
        Report a bug
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div className="bg-surface-800 border border-surface-500 rounded-lg shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-500">
              <h2 className="text-sm font-semibold text-white">Report a bug</h2>
              <button
                onClick={close}
                className="text-gray-500 hover:text-white"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="p-5 space-y-4">
              {(status === "idle" ||
                status === "submitting" ||
                status === "error") && (
                <>
                  <p className="text-xs text-gray-500">
                    Describe what went wrong. We attach the page you're on and
                    your browser info automatically.
                  </p>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={5}
                    maxLength={5000}
                    placeholder="What happened? What did you expect?"
                    className="w-full bg-surface-700 border border-surface-500 rounded p-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-accent"
                  />
                  {status === "error" && (
                    <p className="text-xs text-danger">{errorMsg}</p>
                  )}
                  <div className="flex justify-end gap-2">
                    <button onClick={close} className="btn-ghost text-xs">
                      Cancel
                    </button>
                    <button
                      onClick={() => void handleSubmit()}
                      disabled={!description.trim() || status === "submitting"}
                      className="px-3 py-1.5 text-xs rounded bg-accent text-white hover:bg-accent/80 transition-colors disabled:opacity-50"
                    >
                      {status === "submitting" ? "Sending…" : "Send report"}
                    </button>
                  </div>
                </>
              )}

              {status === "done" && issue && (
                <>
                  <div className="bg-surface-700 rounded-md p-4">
                    <p className="text-sm text-gray-200">
                      Thanks — filed as{" "}
                      <a
                        href={issue.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent hover:underline"
                      >
                        issue #{issue.number}
                      </a>
                      .
                    </p>
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={close}
                      className="px-3 py-1.5 text-xs rounded bg-surface-600 text-gray-200 hover:bg-surface-500 transition-colors"
                    >
                      Done
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run build --workspace=packages/web`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/components/BugReportButton.tsx
git commit -m "feat(web): add bug report button + modal"
```

---

## Task 11: Mount the button in the authenticated shell

**Files:**

- Modify: `packages/web/src/App.tsx`

- [ ] **Step 1: Add the import**

In `packages/web/src/App.tsx`, add to the imports (after the `TrashView` import):

```typescript
import { BugReportButton } from "./components/BugReportButton";
```

- [ ] **Step 2: Render the button in `DashboardView`**

In `DashboardView`'s returned JSX, add `<BugReportButton />` right after `<ItemDrawer />` (still inside the outer `<div className="flex flex-col h-screen overflow-hidden">`):

```tsx
      <ItemDrawer />
      <BugReportButton />
```

(`DashboardView` only renders under the `ProtectedRoute`, so the button is authenticated-only.)

- [ ] **Step 3: Verify it compiles**

Run: `npm run build --workspace=packages/web`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/App.tsx
git commit -m "feat(web): show bug report button on authenticated pages"
```

---

## Task 12: Web component test (Vitest)

**Files:**

- Create: `packages/web/src/components/BugReportButton.test.tsx`

Notes: Vitest globals are enabled (siblings use `describe`/`test`/`beforeEach` without importing them). Mock `../api`. Match the sibling style in `blocks/QuickCapture.test.tsx`.

- [ ] **Step 1: Write the failing test**

Create `packages/web/src/components/BugReportButton.test.tsx` with exactly:

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { BugReportButton } from "./BugReportButton";
import * as api from "../api";

vi.mock("../api", () => ({
  bugReports: { submit: vi.fn() },
}));

const submit = api.bugReports.submit as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("BugReportButton", () => {
  test("submits description with page + user agent and shows the issue link", async () => {
    submit.mockResolvedValue({
      number: 42,
      url: "https://github.com/johnfire/notes-world/issues/42",
    });
    render(<BugReportButton />);

    await userEvent.click(
      screen.getByRole("button", { name: /report a bug/i }),
    );
    await userEvent.type(
      screen.getByPlaceholderText(/what happened/i),
      "Save button does nothing",
    );
    await userEvent.click(screen.getByRole("button", { name: /send report/i }));

    await waitFor(() => expect(submit).toHaveBeenCalledTimes(1));
    expect(submit).toHaveBeenCalledWith(
      expect.objectContaining({
        description: "Save button does nothing",
        page: expect.any(String),
        userAgent: expect.any(String),
      }),
    );
    expect(await screen.findByText(/issue #42/i)).toBeInTheDocument();
  });

  test("keeps the form open and shows the error on failure", async () => {
    submit.mockRejectedValue(new Error("GitHub rejected the issue"));
    render(<BugReportButton />);

    await userEvent.click(
      screen.getByRole("button", { name: /report a bug/i }),
    );
    await userEvent.type(
      screen.getByPlaceholderText(/what happened/i),
      "Something broke",
    );
    await userEvent.click(screen.getByRole("button", { name: /send report/i }));

    expect(
      await screen.findByText(/github rejected the issue/i),
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/what happened/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it passes**

Run: `npm test --workspace=packages/web -- BugReportButton`
Expected: both tests PASS.

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/components/BugReportButton.test.tsx
git commit -m "test(web): cover bug report submit success + error paths"
```

---

## Task 13: Deployment docs

**Files:**

- Modify: `docs/deployment.md`

- [ ] **Step 1: Document the GitHub token + labels**

Add a new section to `docs/deployment.md` (near other environment/config notes):

```markdown
## Bug reporting (GitHub issues)

The in-app "Report a bug" button files a GitHub issue in `johnfire/notes-world`.

- Create a **fine-grained PAT** scoped to `johnfire/notes-world` only, with
  **Issues: Read and write** permission.
- Set it on the server container as `GITHUB_TOKEN`. Optionally override the
  target repo with `GITHUB_REPO` (`owner/repo`, default `johnfire/notes-world`).
- If `GITHUB_TOKEN` is unset, the endpoint returns `503` and the feature is
  simply disabled — the server still runs.
- Ensure the `bug` and `user-reported` labels exist in the repo (GitHub ships a
  `bug` label by default; create `user-reported` once):
  `gh label create user-reported --repo johnfire/notes-world --color ededed`
```

- [ ] **Step 2: Commit**

```bash
git add docs/deployment.md
git commit -m "docs: document bug reporting GitHub token + labels"
```

---

## Task 14: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Build everything**

Run: `npm run build --workspace=packages/server && npm run build --workspace=packages/web`
Expected: both succeed.

- [ ] **Step 2: Run all tests**

Run: `npm test`
Expected: server (Jest) and web (Vitest) suites pass, including the new bug-reports tests.

- [ ] **Step 3: Lint (if configured)**

Run: `npm run lint --workspaces --if-present`
Expected: no new errors.

- [ ] **Step 4: Create the `user-reported` label (one-time)**

Run: `gh label create user-reported --repo johnfire/notes-world --color ededed`
Expected: label created (or "already exists" — fine).

- [ ] **Step 5: End-to-end smoke test against the real API**

Start the dev stack with a token available to the server:

```bash
GITHUB_TOKEN=$(gh auth token) npm run dev
```

Then in the browser at `http://localhost:5173`, log in, click **Report a bug**, submit a test description, and confirm the modal shows "filed as issue #N" with a working link. Verify the issue exists with the `bug` + `user-reported` labels and the context section. Close the test issue:

Run: `gh issue close <N> --repo johnfire/notes-world --comment "test issue from bug-reporting smoke test"`
Expected: issue closed.

- [ ] **Step 6: Final confirmation**

Confirm: server endpoint live at `POST /api/bug-reports`, web button visible only when authenticated, real issue created end-to-end. Feature complete.

---

## Self-Review Notes

- **Spec coverage:** floating button + modal (Tasks 10/11), any logged-in user (mounted under `ProtectedRoute`, Task 11), reporter identity server-side via `findUserById` (Task 3), page + user-agent from client (Task 10), app version + timestamp (Task 3), labels `bug`/`user-reported` (Task 3), GitHub REST via `fetch` (Task 3), rate limit (Task 6), 503 when unconfigured / 502 on GitHub failure / 422 on validation (Tasks 3, 5), no DB persistence (none added), secrets/deploy docs (Task 13), tests (Tasks 4, 8, 12) + e2e verification (Task 14).
- **Type consistency:** `submit`/`submitBugReport` signatures match across client → controller → service; `{ number, url }` shape is consistent end-to-end; `BugReportContext` used in Task 3 and exercised in Task 4.
- **Deviations** from spec are listed at the top and are intentional (process.env config, no i18n, 422 validation).

```

```
