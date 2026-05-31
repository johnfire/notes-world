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
