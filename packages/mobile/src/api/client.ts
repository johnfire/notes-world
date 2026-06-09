import * as SecureStore from "expo-secure-store";

export const BASE_URL = "https://notes-world.christopherrehm.de/api";
const TOKEN_KEY = "nw_access_token";
const REFRESH_KEY = "nw_refresh_token";

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_KEY);
}

export async function setRefreshToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(REFRESH_KEY, token);
}

export async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_KEY);
}

// The access token lives ~15 min; the refresh token ~30 days (rotating). When a
// request gets a 401 we transparently exchange the refresh token for a fresh
// pair and retry once, so the user stays logged in as long as they keep using
// the app. A single in-flight refresh is shared so concurrent 401s don't each
// spend (and invalidate) the rotating refresh token.
type RefreshOutcome =
  | { status: "refreshed"; token: string }
  | { status: "expired" } // no refresh token, or the server rejected it
  | { status: "error" }; // network/server blip — the session may still be valid

// Invoked when the session is definitively dead (refresh token missing or
// rejected) so the UI can drop to the login screen instead of looping on
// failed requests and looking like the user's data vanished.
let authFailureHandler: (() => void) | null = null;

export function setAuthFailureHandler(handler: (() => void) | null): void {
  authFailureHandler = handler;
}

let refreshInFlight: Promise<RefreshOutcome> | null = null;

async function doRefresh(): Promise<RefreshOutcome> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    await clearToken();
    return { status: "expired" };
  }
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Client-Type": "native-app",
        "X-Refresh-Token": refreshToken,
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (res.ok) {
      const data = await res.json();
      await setToken(data.access_token);
      if (data.refresh_token) await setRefreshToken(data.refresh_token);
      return { status: "refreshed", token: data.access_token as string };
    }
    if (res.status === 401 || res.status === 403) {
      // Refresh token expired/revoked — clear everything so the app logs out.
      await clearToken();
      return { status: "expired" };
    }
    // 5xx or other transient failure — keep tokens so a later request retries.
    return { status: "error" };
  } catch {
    // Network error — keep tokens so a later request can retry.
    return { status: "error" };
  }
}

function refreshSession(): Promise<RefreshOutcome> {
  if (!refreshInFlight) {
    refreshInFlight = doRefresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  retryOnAuthFail = true,
): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Client-Type": "native-app",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401 && retryOnAuthFail) {
    const outcome = await refreshSession();
    if (outcome.status === "refreshed") {
      return request<T>(path, options, false);
    }
    if (outcome.status === "expired") {
      // Session is gone — tell the app to drop to the login screen rather than
      // surfacing a confusing "expired token" error on every data screen.
      authFailureHandler?.();
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message =
      body.error?.message ??
      body.message ??
      res.statusText ??
      `HTTP ${res.status}`;
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "DELETE",
      ...(body ? { body: JSON.stringify(body) } : {}),
    }),
};
