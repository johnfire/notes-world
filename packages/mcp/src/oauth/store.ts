import crypto from "crypto";

interface AuthCodeEntry {
  code_challenge: string;
  redirect_uri: string;
  client_id: string;
  nw_key: string;
  expires_at: number;
}

interface RefreshTokenEntry {
  nw_key: string;
  expires_at: number;
}

const AUTH_CODE_TTL_MS = 10 * 60 * 1000;
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const authCodes = new Map<string, AuthCodeEntry>();
const refreshTokens = new Map<string, RefreshTokenEntry>();

function pruneExpired<T extends { expires_at: number }>(
  map: Map<string, T>,
): void {
  const now = Date.now();
  for (const [key, entry] of map) {
    if (entry.expires_at < now) map.delete(key);
  }
}

export function createAuthCode(
  params: Omit<AuthCodeEntry, "expires_at">,
): string {
  pruneExpired(authCodes);
  const code = crypto.randomBytes(32).toString("hex");
  authCodes.set(code, { ...params, expires_at: Date.now() + AUTH_CODE_TTL_MS });
  return code;
}

export function consumeAuthCode(code: string): AuthCodeEntry | null {
  const entry = authCodes.get(code);
  authCodes.delete(code);
  if (!entry || entry.expires_at < Date.now()) return null;
  return entry;
}

export function createRefreshToken(nw_key: string): string {
  pruneExpired(refreshTokens);
  const token = crypto.randomBytes(48).toString("hex");
  refreshTokens.set(token, {
    nw_key,
    expires_at: Date.now() + REFRESH_TOKEN_TTL_MS,
  });
  return token;
}

export function consumeRefreshToken(token: string): { nw_key: string } | null {
  const entry = refreshTokens.get(token);
  refreshTokens.delete(token);
  if (!entry || entry.expires_at < Date.now()) return null;
  return { nw_key: entry.nw_key };
}
