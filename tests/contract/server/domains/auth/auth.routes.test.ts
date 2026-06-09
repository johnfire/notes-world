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

// ── Native-client refresh token delivery ─────────────────────────────────────
// React Native can't persist the httpOnly refresh cookie, so for native clients
// (X-Client-Type: native-app) the refresh token is also returned in the JSON
// body. Web clients must continue to receive it only via the cookie so it never
// touches client-side JS.

describe("POST /api/auth/login — refresh token delivery", () => {
  beforeEach(() => {
    mockService.login.mockResolvedValue({
      user: { id: "u1", email: "a@example.com", role: "free" } as never,
      tokens: { access_token: "tok123", expires_in: 900 },
      rawRefreshToken: "rawref",
    });
  });

  test("native client receives refresh_token in body", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .set("X-Client-Type", "native-app")
      .send({ email: "a@example.com", password: "password123" });

    expect(res.status).toBe(200);
    expect(res.body.refresh_token).toBe("rawref");
    expect(res.body.access_token).toBe("tok123");
  });

  test("web client does NOT receive refresh_token in body (cookie only)", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .set("X-Client-Type", "web")
      .send({ email: "a@example.com", password: "password123" });

    expect(res.status).toBe(200);
    expect(res.body).not.toHaveProperty("refresh_token");
    expect(String(res.headers["set-cookie"])).toContain("refresh_token=");
  });
});

describe("POST /api/auth/refresh — native client", () => {
  test("accepts refresh token via X-Refresh-Token header and returns new pair in body", async () => {
    mockService.refresh.mockResolvedValue({
      tokens: { access_token: "newtok", expires_in: 900 },
      rawRefreshToken: "newref",
    });

    const res = await request(app)
      .post("/api/auth/refresh")
      .set("X-Client-Type", "native-app")
      .set("X-Refresh-Token", "oldref")
      .send({});

    expect(res.status).toBe(200);
    expect(mockService.refresh).toHaveBeenCalledWith("oldref");
    expect(res.body.access_token).toBe("newtok");
    expect(res.body.refresh_token).toBe("newref");
  });
});
