import { describe, it, expect, vi, beforeEach } from "vitest";

// In-memory stand-in for expo-secure-store. Hoisted so the vi.mock factory
// (which is itself hoisted above the imports) can reference it.
const { store } = vi.hoisted(() => ({ store: {} as Record<string, string> }));

vi.mock("expo-secure-store", () => ({
  getItemAsync: vi.fn(async (k: string) => store[k] ?? null),
  setItemAsync: vi.fn(async (k: string, v: string) => {
    store[k] = v;
  }),
  deleteItemAsync: vi.fn(async (k: string) => {
    delete store[k];
  }),
}));

import { api, setAuthFailureHandler, ApiError } from "./client";

const ACCESS_KEY = "nw_access_token";
const REFRESH_KEY = "nw_refresh_token";

function res(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

beforeEach(() => {
  for (const k of Object.keys(store)) delete store[k];
  setAuthFailureHandler(null);
  vi.restoreAllMocks();
});

describe("api client token refresh", () => {
  it("logs out (and clears tokens) when the refresh token is rejected", async () => {
    store[ACCESS_KEY] = "expired-access";
    store[REFRESH_KEY] = "stale-refresh";
    const onAuthFailure = vi.fn();
    setAuthFailureHandler(onAuthFailure);

    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(res(401, { error: { message: "expired" } })) // GET
      .mockResolvedValueOnce(res(403, { error: { message: "bad refresh" } })); // /auth/refresh

    await expect(api.get("/checklists")).rejects.toBeInstanceOf(ApiError);

    expect(onAuthFailure).toHaveBeenCalledTimes(1);
    expect(store[ACCESS_KEY]).toBeUndefined();
    expect(store[REFRESH_KEY]).toBeUndefined();
  });

  it("refreshes and retries the request when the refresh succeeds", async () => {
    store[ACCESS_KEY] = "expired-access";
    store[REFRESH_KEY] = "good-refresh";
    const onAuthFailure = vi.fn();
    setAuthFailureHandler(onAuthFailure);

    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(res(401, {})) // GET → access token expired
      .mockResolvedValueOnce(
        res(200, {
          access_token: "new-access",
          refresh_token: "new-refresh",
          expires_in: 900,
        }),
      ) // /auth/refresh
      .mockResolvedValueOnce(res(200, { items: [] })); // retried GET

    const result = await api.get<{ items: unknown[] }>("/items");

    expect(result).toEqual({ items: [] });
    expect(store[ACCESS_KEY]).toBe("new-access");
    expect(store[REFRESH_KEY]).toBe("new-refresh");
    expect(onAuthFailure).not.toHaveBeenCalled();
  });

  it("refreshes and retries when the server rejects the access token with 403", async () => {
    // The API answers expired/invalid access tokens with 403 (not 401); the
    // client must treat both as a refresh trigger — this is what broke every
    // screen ~15 min after login ("lost the lists").
    store[ACCESS_KEY] = "expired-access";
    store[REFRESH_KEY] = "good-refresh";
    const onAuthFailure = vi.fn();
    setAuthFailureHandler(onAuthFailure);

    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(
        res(403, { error: { message: "Invalid or expired access token" } }),
      ) // GET → 403
      .mockResolvedValueOnce(
        res(200, {
          access_token: "new-access",
          refresh_token: "new-refresh",
          expires_in: 900,
        }),
      ) // /auth/refresh
      .mockResolvedValueOnce(res(200, [{ id: "c1" }])); // retried GET

    const result = await api.get<Array<{ id: string }>>("/checklists");

    expect(result).toEqual([{ id: "c1" }]);
    expect(store[ACCESS_KEY]).toBe("new-access");
    expect(onAuthFailure).not.toHaveBeenCalled();
  });

  it("does NOT log out on a network error during refresh (keeps the session)", async () => {
    store[ACCESS_KEY] = "expired-access";
    store[REFRESH_KEY] = "good-refresh";
    const onAuthFailure = vi.fn();
    setAuthFailureHandler(onAuthFailure);

    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(res(401, {})) // GET
      .mockRejectedValueOnce(new Error("network down")); // /auth/refresh throws

    await expect(api.get("/items")).rejects.toBeInstanceOf(ApiError);

    expect(onAuthFailure).not.toHaveBeenCalled();
    expect(store[ACCESS_KEY]).toBe("expired-access");
    expect(store[REFRESH_KEY]).toBe("good-refresh");
  });
});
