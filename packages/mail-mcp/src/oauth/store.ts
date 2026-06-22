import crypto from "crypto";
import fs from "fs";

interface AuthCodeEntry {
  code_challenge: string;
  redirect_uri: string;
  client_id: string;
  api_key: string;
  expires_at: number;
}

interface RefreshTokenEntry {
  api_key: string;
  expires_at: number;
}

const AUTH_CODE_TTL_MS = 10 * 60 * 1000;
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const authCodes = new Map<string, AuthCodeEntry>();
const refreshTokens = new Map<string, RefreshTokenEntry>();

// Restart survival: refresh tokens are write-through persisted to
// MAIL_MCP_STORE_PATH (a docker volume in prod). Without this every deploy
// wiped the store and connectors (claude.ai etc.) had to re-authenticate.
// authCodes are 10-minute ephemera and deliberately not persisted.
const STORE_PATH = process.env.MAIL_MCP_STORE_PATH || "";

function loadStore(): void {
  if (!STORE_PATH || !fs.existsSync(STORE_PATH)) return;
  try {
    const raw = JSON.parse(fs.readFileSync(STORE_PATH, "utf8"));
    for (const [token, entry] of raw.refreshTokens ?? [])
      refreshTokens.set(token, entry);
    pruneExpired(refreshTokens);
  } catch (err) {
    console.error("oauth store load failed, starting empty:", err);
  }
}

let persistTimer: NodeJS.Timeout | null = null;
function persistStore(): void {
  if (!STORE_PATH || persistTimer) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    persistNow();
  }, 100);
  persistTimer.unref?.();
}

function persistNow(): void {
  if (!STORE_PATH) return;
  try {
    const tmp = STORE_PATH + ".tmp";
    fs.writeFileSync(
      tmp,
      JSON.stringify({ refreshTokens: [...refreshTokens] }),
      { mode: 0o600 },
    );
    fs.renameSync(tmp, STORE_PATH);
  } catch (err) {
    console.error("oauth store persist failed:", err);
  }
}

process.once("SIGTERM", persistNow);
process.once("SIGINT", persistNow);
loadStore();

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

export function createRefreshToken(apiKey: string): string {
  pruneExpired(refreshTokens);
  const token = crypto.randomBytes(48).toString("hex");
  refreshTokens.set(token, {
    api_key: apiKey,
    expires_at: Date.now() + REFRESH_TOKEN_TTL_MS,
  });
  persistStore();
  return token;
}

export function consumeRefreshToken(token: string): { api_key: string } | null {
  const entry = refreshTokens.get(token);
  refreshTokens.delete(token);
  persistStore();
  if (!entry || entry.expires_at < Date.now()) return null;
  return { api_key: entry.api_key };
}
