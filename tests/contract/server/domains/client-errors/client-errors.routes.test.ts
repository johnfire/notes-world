import request from "supertest";

jest.mock(
  "../../../../../packages/server/src/domains/client-errors/client-errors.service",
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

import * as service from "../../../../../packages/server/src/domains/client-errors/client-errors.service";
import { createApp } from "../../../../../packages/server/src/app";

const mockService = service as jest.Mocked<typeof service>;
const app = createApp();

beforeEach(() => jest.clearAllMocks());

describe("POST /api/client-errors", () => {
  test("202 and records the report (public, no auth required)", async () => {
    const res = await request(app).post("/api/client-errors").send({
      app: "mobile",
      message: "TypeError: undefined is not a function",
      appVersion: "1.0.0",
      platform: "android",
      context: "ItemScreen",
      stack: "at foo (bar.js:1:1)",
    });

    expect(res.status).toBe(202);
    expect(res.body).toEqual({ status: "accepted" });
    expect(mockService.recordClientError).toHaveBeenCalledWith(
      expect.objectContaining({
        app: "mobile",
        message: "TypeError: undefined is not a function",
        appVersion: "1.0.0",
        platform: "android",
        context: "ItemScreen",
        stack: "at foo (bar.js:1:1)",
      }),
    );
  });

  test("defaults app to 'unknown' when omitted", async () => {
    const res = await request(app)
      .post("/api/client-errors")
      .send({ message: "boom" });

    expect(res.status).toBe(202);
    expect(mockService.recordClientError).toHaveBeenCalledWith(
      expect.objectContaining({ app: "unknown", message: "boom" }),
    );
  });

  test("422 when message is missing", async () => {
    const res = await request(app).post("/api/client-errors").send({});
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(mockService.recordClientError).not.toHaveBeenCalled();
  });

  test("422 when message is blank", async () => {
    const res = await request(app)
      .post("/api/client-errors")
      .send({ message: "   " });
    expect(res.status).toBe(422);
    expect(mockService.recordClientError).not.toHaveBeenCalled();
  });
});
