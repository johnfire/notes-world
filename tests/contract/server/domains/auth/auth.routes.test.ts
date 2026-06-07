import request from "supertest";

jest.mock("../../../../../packages/server/src/domains/auth/auth.service");
jest.mock("../../../../../packages/server/src/db/client", () => ({
  getPool: jest.fn(),
  query: jest.fn(),
  queryOne: jest.fn(),
  withTransaction: jest.fn(),
  closePool: jest.fn(),
}));

import * as service from "../../../../../packages/server/src/domains/auth/auth.service";
import { createApp } from "../../../../../packages/server/src/app";
import { ConflictError } from "../../../../../packages/server/src/utils/errors";

const mockService = service as jest.Mocked<typeof service>;
const app = createApp();

beforeEach(() => jest.clearAllMocks());

// ── POST /api/auth/register — account enumeration hardening (audit LOW #1) ───
// When an email is already registered, the endpoint must return a generic
// success-shaped 200 (no tokens, no user) so the signup form cannot be used to
// enumerate registered accounts.

describe("POST /api/auth/register", () => {
  test("201 with tokens on successful new-account registration", async () => {
    mockService.register.mockResolvedValue({
      user: { id: "u1", email: "new@example.com", role: "free" } as never,
      tokens: { access_token: "tok123", expires_in: 900 },
      rawRefreshToken: "rawref",
    });

    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "new@example.com", password: "password123" });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("access_token");
    expect(res.body).toHaveProperty("user");
  });

  test("200 with generic message when email already registered — no tokens or user exposed", async () => {
    mockService.register.mockRejectedValue(
      new ConflictError("Email already registered"),
    );

    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "taken@example.com", password: "password123" });

    expect(res.status).toBe(200);
    expect(res.body).not.toHaveProperty("access_token");
    expect(res.body).not.toHaveProperty("user");
    expect(typeof res.body.message).toBe("string");
  });
});
