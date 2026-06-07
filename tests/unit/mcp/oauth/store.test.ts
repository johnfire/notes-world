import {
  createAuthCode,
  consumeAuthCode,
  createRefreshToken,
  consumeRefreshToken,
} from "../../../../packages/mcp/src/oauth/store";

describe("auth code store", () => {
  test("createAuthCode returns a hex string and consumeAuthCode retrieves it once", () => {
    const params = {
      code_challenge: "abc123",
      redirect_uri: "https://claude.ai/callback",
      client_id: "notes-world-mcp",
      nw_key: "nw_test",
    };
    const code = createAuthCode(params);
    expect(typeof code).toBe("string");
    expect(code.length).toBeGreaterThan(0);

    const entry = consumeAuthCode(code);
    expect(entry).not.toBeNull();
    expect(entry!.code_challenge).toBe("abc123");
    expect(entry!.nw_key).toBe("nw_test");

    // single-use: second consume returns null
    expect(consumeAuthCode(code)).toBeNull();
  });

  test("consumeAuthCode returns null for unknown code", () => {
    expect(consumeAuthCode("does-not-exist")).toBeNull();
  });

  test("consumeAuthCode returns null for expired code (fake timers)", () => {
    jest.useFakeTimers();
    const code = createAuthCode({
      code_challenge: "y",
      redirect_uri: "https://claude.ai/cb",
      client_id: "c",
      nw_key: "nw_y",
    });
    jest.advanceTimersByTime(11 * 60 * 1000); // 11 minutes
    expect(consumeAuthCode(code)).toBeNull();
    jest.useRealTimers();
  });
});

describe("refresh token store", () => {
  test("createRefreshToken returns a string and consumeRefreshToken retrieves it once", () => {
    const token = createRefreshToken("nw_abc");
    expect(typeof token).toBe("string");

    const result = consumeRefreshToken(token);
    expect(result).not.toBeNull();
    expect(result!.nw_key).toBe("nw_abc");

    // rotated: second consume returns null
    expect(consumeRefreshToken(token)).toBeNull();
  });

  test("consumeRefreshToken returns null for unknown token", () => {
    expect(consumeRefreshToken("no-such-token")).toBeNull();
  });
});
