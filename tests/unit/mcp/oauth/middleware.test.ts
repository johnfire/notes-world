import express, { Request, Response } from "express";
import request from "supertest";
import { createMcpAuthMiddleware } from "../../../../packages/mcp/src/oauth/middleware";
import { signMcpAccessToken } from "../../../../packages/mcp/src/oauth/tokens";

process.env.MCP_JWT_SECRET = "test-secret";

function buildApp() {
  const app = express();
  app.use(createMcpAuthMiddleware());
  app.get("/test", (_req: Request, res: Response) => res.json({ ok: true }));
  return app;
}

describe("MCP auth middleware", () => {
  test("passes request with valid nw_ key in x-api-key header", async () => {
    const res = await request(buildApp())
      .get("/test")
      .set("x-api-key", "nw_validkey123");

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  test("passes request with valid JWT in Authorization: Bearer header", async () => {
    const token = signMcpAccessToken("nw_fromjwt");
    const res = await request(buildApp())
      .get("/test")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  test("401 when no auth header is present", async () => {
    const res = await request(buildApp()).get("/test");
    expect(res.status).toBe(401);
  });

  test("401 when JWT is signed with wrong secret", async () => {
    const jwt = require("jsonwebtoken");
    const bad = jwt.sign(
      { sub: "mcp-service", nw_key: "nw_x" },
      "wrong-secret",
      { algorithm: "HS256" },
    );
    const res = await request(buildApp())
      .get("/test")
      .set("Authorization", `Bearer ${bad}`);

    expect(res.status).toBe(401);
  });

  test("401 when token is neither nw_ nor valid JWT", async () => {
    const res = await request(buildApp())
      .get("/test")
      .set("x-api-key", "invalid-garbage-token");

    expect(res.status).toBe(401);
  });
});
