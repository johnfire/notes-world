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
