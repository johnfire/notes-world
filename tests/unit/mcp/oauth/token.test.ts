import express from "express";
import request from "supertest";
import crypto from "crypto";
import { createTokenRouter } from "../../../../packages/mcp/src/oauth/token";
import {
  createAuthCode,
  createRefreshToken,
} from "../../../../packages/mcp/src/oauth/store";

process.env.MCP_JWT_SECRET = "test-secret";

const CLIENT_ID = "notes-world-mcp";
const NW_KEY = "nw_testkey";
const REDIRECT_URI = "https://claude.ai/callback";

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(createTokenRouter());
  return app;
}

function makePkce() {
  const verifier = crypto.randomBytes(32).toString("base64url");
  const challenge = crypto
    .createHash("sha256")
    .update(verifier)
    .digest("base64url");
  return { verifier, challenge };
}

describe("POST /oauth/token — authorization_code grant", () => {
  test("returns access_token and refresh_token for valid code exchange", async () => {
    const { verifier, challenge } = makePkce();
    const code = createAuthCode({
      code_challenge: challenge,
      redirect_uri: REDIRECT_URI,
      client_id: CLIENT_ID,
      nw_key: NW_KEY,
    });

    const res = await request(buildApp())
      .post("/oauth/token")
      .type("form")
      .send({
        grant_type: "authorization_code",
        code,
        redirect_uri: REDIRECT_URI,
        client_id: CLIENT_ID,
        code_verifier: verifier,
      });

    expect(res.status).toBe(200);
    expect(res.body.token_type).toBe("Bearer");
    expect(typeof res.body.access_token).toBe("string");
    expect(typeof res.body.refresh_token).toBe("string");
    expect(res.body.expires_in).toBe(3600);
  });

  test("400 invalid_grant for unknown code", async () => {
    const res = await request(buildApp())
      .post("/oauth/token")
      .type("form")
      .send({
        grant_type: "authorization_code",
        code: "does-not-exist",
        redirect_uri: REDIRECT_URI,
        client_id: CLIENT_ID,
        code_verifier: "anything",
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("invalid_grant");
  });

  test("400 invalid_grant when PKCE verifier does not match challenge", async () => {
    const { challenge } = makePkce();
    const code = createAuthCode({
      code_challenge: challenge,
      redirect_uri: REDIRECT_URI,
      client_id: CLIENT_ID,
      nw_key: NW_KEY,
    });

    const res = await request(buildApp())
      .post("/oauth/token")
      .type("form")
      .send({
        grant_type: "authorization_code",
        code,
        redirect_uri: REDIRECT_URI,
        client_id: CLIENT_ID,
        code_verifier: "wrong-verifier",
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("invalid_grant");
  });

  test("400 invalid_grant when redirect_uri does not match", async () => {
    const { verifier, challenge } = makePkce();
    const code = createAuthCode({
      code_challenge: challenge,
      redirect_uri: REDIRECT_URI,
      client_id: CLIENT_ID,
      nw_key: NW_KEY,
    });

    const res = await request(buildApp())
      .post("/oauth/token")
      .type("form")
      .send({
        grant_type: "authorization_code",
        code,
        redirect_uri: "https://claude.ai/other",
        client_id: CLIENT_ID,
        code_verifier: verifier,
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("invalid_grant");
  });

  test("400 invalid_request when required fields are missing", async () => {
    const res = await request(buildApp())
      .post("/oauth/token")
      .type("form")
      .send({ grant_type: "authorization_code" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("invalid_request");
  });
});

describe("POST /oauth/token — refresh_token grant", () => {
  test("returns new access_token and new refresh_token (token rotation)", async () => {
    const original = createRefreshToken(NW_KEY);

    const res = await request(buildApp())
      .post("/oauth/token")
      .type("form")
      .send({ grant_type: "refresh_token", refresh_token: original });

    expect(res.status).toBe(200);
    expect(typeof res.body.access_token).toBe("string");
    expect(typeof res.body.refresh_token).toBe("string");
    expect(res.body.refresh_token).not.toBe(original);
  });

  test("400 invalid_grant for unknown refresh token", async () => {
    const res = await request(buildApp())
      .post("/oauth/token")
      .type("form")
      .send({ grant_type: "refresh_token", refresh_token: "no-such-token" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("invalid_grant");
  });
});

describe("POST /oauth/token — unsupported grant", () => {
  test("400 unsupported_grant_type for client_credentials", async () => {
    const res = await request(buildApp())
      .post("/oauth/token")
      .type("form")
      .send({
        grant_type: "client_credentials",
        client_id: "x",
        client_secret: "y",
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("unsupported_grant_type");
  });
});
