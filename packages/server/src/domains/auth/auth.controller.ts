import { Request, Response } from "express";
import { randomBytes, createHash } from "crypto";
import { wrapAsync } from "../../utils/wrapAsync";
import * as service from "./auth.service";
import * as authRepo from "./auth.repository";

function detectClient(req: Request): string {
  const ua = req.headers["user-agent"] ?? "";
  const clientHeader = req.headers["x-client-type"] as string | undefined;
  if (clientHeader) return clientHeader;
  if (ua.includes("Expo") || ua.includes("okhttp")) return "native-app";
  if (ua.includes("Mozilla") || ua.includes("Chrome") || ua.includes("Safari"))
    return "web";
  return `unknown (${ua.slice(0, 60)})`;
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  return `${local.slice(0, 2)}***@${domain}`;
}

const REFRESH_COOKIE = "refresh_token";
const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  maxAge: 30 * 24 * 60 * 60 * 1000,
  path: "/api/auth",
};

export const register = wrapAsync(async (req: Request, res: Response) => {
  const { user, tokens, rawRefreshToken } = await service.register({
    email: req.body.email,
    password: req.body.password,
  });
  res.cookie(REFRESH_COOKIE, rawRefreshToken, COOKIE_OPTS);
  res.status(201).json({ user, ...tokens });
});

export const login = wrapAsync(async (req: Request, res: Response) => {
  const clientSource = detectClient(req);
  const emailMasked = maskEmail(req.body.email ?? "");
  console.log(
    `[auth] login attempt — ${emailMasked} from ${clientSource} ip=${req.ip}`,
  );
  try {
    const { user, tokens, rawRefreshToken } = await service.login({
      email: req.body.email,
      password: req.body.password,
    });
    console.log(`[auth] login ok — ${emailMasked} from ${clientSource}`);
    res.cookie(REFRESH_COOKIE, rawRefreshToken, COOKIE_OPTS);
    res.json({ user, ...tokens });
  } catch (err) {
    console.log(
      `[auth] login failed — ${emailMasked} from ${clientSource}: ${(err as Error).message}`,
    );
    throw err;
  }
});

export const refresh = wrapAsync(async (req: Request, res: Response) => {
  const raw = req.cookies?.[REFRESH_COOKIE];
  const { tokens, rawRefreshToken } = await service.refresh(raw);
  res.cookie(REFRESH_COOKIE, rawRefreshToken, COOKIE_OPTS);
  res.json(tokens);
});

export const logout = wrapAsync(async (req: Request, res: Response) => {
  const raw = req.cookies?.[REFRESH_COOKIE];
  await service.logout(raw);
  res.clearCookie(REFRESH_COOKIE, { path: "/api/auth" });
  res.status(204).end();
});

export const getMe = wrapAsync(async (req: Request, res: Response) => {
  const user = await service.getMe(req.userId!);
  res.json(user);
});

export const changePassword = wrapAsync(async (req: Request, res: Response) => {
  await service.changePassword(
    req.userId!,
    req.body.current_password,
    req.body.new_password,
  );
  res.status(204).end();
});

export const changeEmail = wrapAsync(async (req: Request, res: Response) => {
  const user = await service.changeEmail(
    req.userId!,
    req.body.email,
    req.body.current_password,
  );
  res.json(user);
});

export const deleteAccount = wrapAsync(async (req: Request, res: Response) => {
  await service.deleteAccount(req.userId!, req.body.current_password);
  res.clearCookie(REFRESH_COOKIE, { path: "/api/auth" });
  res.status(204).end();
});

// ── API Keys ──────────────────────────────────────────────────────────────────

export const createApiKey = wrapAsync(async (req: Request, res: Response) => {
  const name =
    typeof req.body.name === "string" && req.body.name.trim()
      ? req.body.name.trim()
      : "MCP";
  const rawKey = "nw_" + randomBytes(32).toString("hex");
  const keyHash = createHash("sha256").update(rawKey).digest("hex");
  const keyPrefix = rawKey.slice(0, 12);
  const row = await authRepo.insertApiKey(
    req.userId!,
    keyHash,
    keyPrefix,
    name,
  );
  // Return the raw key only once — it is not stored and cannot be retrieved again
  res.status(201).json({ ...row, key: rawKey });
});

export const listApiKeys = wrapAsync(async (req: Request, res: Response) => {
  const keys = await authRepo.listApiKeys(req.userId!);
  res.json(keys);
});

export const deleteApiKey = wrapAsync(async (req: Request, res: Response) => {
  const found = await authRepo.deleteApiKeyByPrefix(
    req.params.prefix,
    req.userId!,
  );
  if (!found) {
    res.status(404).json({ error: { message: "API key not found" } });
    return;
  }
  res.status(204).end();
});
