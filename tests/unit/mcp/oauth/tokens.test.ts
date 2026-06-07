process.env.MCP_JWT_SECRET = "test-mcp-jwt-secret-for-tests-only";

import {
  signMcpAccessToken,
  verifyMcpAccessToken,
  ACCESS_TOKEN_TTL_SEC,
} from "../../../../packages/mcp/src/oauth/tokens";
import jwt from "jsonwebtoken";

describe("signMcpAccessToken", () => {
  test("returns a JWT with sub=mcp-service and the nw_key claim", () => {
    const token = signMcpAccessToken("nw_testkey");
    const decoded = jwt.decode(token) as Record<string, unknown>;
    expect(decoded.sub).toBe("mcp-service");
    expect(decoded.nw_key).toBe("nw_testkey");
  });

  test("token expires in ACCESS_TOKEN_TTL_SEC seconds", () => {
    const before = Math.floor(Date.now() / 1000);
    const token = signMcpAccessToken("nw_x");
    const decoded = jwt.decode(token) as { exp: number; iat: number };
    expect(decoded.exp - decoded.iat).toBe(ACCESS_TOKEN_TTL_SEC);
    expect(decoded.iat).toBeGreaterThanOrEqual(before);
  });
});

describe("verifyMcpAccessToken", () => {
  test("returns payload for a valid token", () => {
    const token = signMcpAccessToken("nw_abc");
    const payload = verifyMcpAccessToken(token);
    expect(payload).not.toBeNull();
    expect(payload!.nw_key).toBe("nw_abc");
    expect(payload!.sub).toBe("mcp-service");
  });

  test("returns null for a token signed with a different secret", () => {
    const bad = jwt.sign(
      { sub: "mcp-service", nw_key: "nw_x" },
      "wrong-secret",
      { algorithm: "HS256" },
    );
    expect(verifyMcpAccessToken(bad)).toBeNull();
  });

  test("returns null for an expired token", () => {
    const expired = jwt.sign(
      { sub: "mcp-service", nw_key: "nw_x" },
      "test-mcp-jwt-secret-for-tests-only",
      { algorithm: "HS256", expiresIn: -1 },
    );
    expect(verifyMcpAccessToken(expired)).toBeNull();
  });

  test("returns null for a token signed with a different algorithm", () => {
    const hs512 = jwt.sign(
      { sub: "mcp-service", nw_key: "nw_x" },
      "test-mcp-jwt-secret-for-tests-only",
      { algorithm: "HS512" },
    );
    expect(verifyMcpAccessToken(hs512)).toBeNull();
  });
});
