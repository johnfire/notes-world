import express from "express";
import request from "supertest";
import { createAuthorizeRouter } from "../../../../packages/mcp/src/oauth/authorize";

process.env.MCP_JWT_SECRET = "test-secret";

const CLIENT_ID = "notes-world-mcp";
const NW_KEY = "nw_testkey123";

function buildApp() {
  const app = express();
  app.use(createAuthorizeRouter(CLIENT_ID, () => NW_KEY));
  return app;
}

const VALID_PARAMS = {
  response_type: "code",
  client_id: CLIENT_ID,
  redirect_uri: "https://claude.ai/callback",
  code_challenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
  code_challenge_method: "S256",
  state: "xyz",
};

describe("GET /oauth/authorize", () => {
  test("redirects with code and state when all params are valid", async () => {
    const res = await request(buildApp())
      .get("/oauth/authorize")
      .query(VALID_PARAMS);

    expect(res.status).toBe(302);
    const location = new URL(res.headers.location);
    expect(location.searchParams.get("code")).toBeTruthy();
    expect(location.searchParams.get("state")).toBe("xyz");
    expect(location.searchParams.get("error")).toBeNull();
  });

  test("400 when response_type is not 'code'", async () => {
    const res = await request(buildApp())
      .get("/oauth/authorize")
      .query({ ...VALID_PARAMS, response_type: "token" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("unsupported_response_type");
  });

  test("400 when client_id does not match", async () => {
    const res = await request(buildApp())
      .get("/oauth/authorize")
      .query({ ...VALID_PARAMS, client_id: "wrong" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("invalid_client");
  });

  test("400 when redirect_uri is not HTTPS", async () => {
    const res = await request(buildApp())
      .get("/oauth/authorize")
      .query({ ...VALID_PARAMS, redirect_uri: "http://claude.ai/callback" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("invalid_request");
  });

  test("400 when code_challenge_method is not S256", async () => {
    const res = await request(buildApp())
      .get("/oauth/authorize")
      .query({ ...VALID_PARAMS, code_challenge_method: "plain" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("invalid_request");
  });

  test("400 when code_challenge is missing", async () => {
    const { code_challenge: _, ...params } = VALID_PARAMS;
    const res = await request(buildApp()).get("/oauth/authorize").query(params);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("invalid_request");
  });
});
