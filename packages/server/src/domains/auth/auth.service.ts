import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { User } from "../../types";
import {
  ValidationError,
  ConflictError,
  AuthorizationError,
} from "../../utils/errors";
import {
  AuthTokens,
  JwtPayload,
  RegisterInput,
  LoginInput,
} from "./auth.types";
import * as repo from "./auth.repository";

const BCRYPT_ROUNDS = 12;
const ACCESS_TOKEN_TTL_SEC = 15 * 60; // 15 minutes
const REFRESH_TOKEN_TTL_DAYS = 30;

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET environment variable is not set");
  return secret;
}

function signAccessToken(userId: string, email: string): string {
  return jwt.sign({ sub: userId, email } satisfies JwtPayload, getJwtSecret(), {
    expiresIn: ACCESS_TOKEN_TTL_SEC,
  });
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function issueTokens(
  user: User,
): Promise<{ tokens: AuthTokens; rawRefreshToken: string }> {
  const accessToken = signAccessToken(user.id, user.email);
  const rawRefreshToken = crypto.randomBytes(48).toString("hex");
  const tokenHash = hashToken(rawRefreshToken);
  const expiresAt = new Date(
    Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  );
  await repo.insertRefreshToken(user.id, tokenHash, expiresAt);
  return {
    tokens: { access_token: accessToken, expires_in: ACCESS_TOKEN_TTL_SEC },
    rawRefreshToken,
  };
}

export async function register(
  input: RegisterInput,
): Promise<{ user: User; tokens: AuthTokens; rawRefreshToken: string }> {
  if (!input.email || !input.email.includes("@")) {
    throw new ValidationError("Invalid email address");
  }
  if (!input.password || input.password.length < 8) {
    throw new ValidationError("Password must be at least 8 characters");
  }

  const existing = await repo.findUserByEmail(input.email.toLowerCase());
  if (existing) throw new ConflictError("Email already registered");

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  const user = await repo.insertUser(input.email.toLowerCase(), passwordHash);
  const { tokens, rawRefreshToken } = await issueTokens(user);
  return { user, tokens, rawRefreshToken };
}

export async function login(
  input: LoginInput,
): Promise<{ user: User; tokens: AuthTokens; rawRefreshToken: string }> {
  const row = await repo.findUserByEmail(input.email.toLowerCase());
  if (!row) throw new AuthorizationError("Invalid email or password");

  const valid = await bcrypt.compare(input.password, row.password_hash);
  if (!valid) throw new AuthorizationError("Invalid email or password");

  const { password_hash: _, ...user } = row;
  const { tokens, rawRefreshToken } = await issueTokens(user as User);
  return { user: user as User, tokens, rawRefreshToken };
}

export async function refresh(
  rawRefreshToken: string | undefined,
): Promise<{ tokens: AuthTokens; rawRefreshToken: string }> {
  if (!rawRefreshToken) throw new AuthorizationError("Refresh token required");

  const tokenHash = hashToken(rawRefreshToken);
  const stored = await repo.findRefreshToken(tokenHash);

  if (!stored || new Date(stored.expires_at) < new Date()) {
    if (stored) await repo.deleteRefreshToken(tokenHash);
    throw new AuthorizationError("Invalid or expired refresh token");
  }

  // Rotate: delete old token, issue new pair
  await repo.deleteRefreshToken(tokenHash);
  const user = await repo.findUserById(stored.user_id);
  if (!user) throw new AuthorizationError("User not found");

  return issueTokens(user);
}

export async function logout(
  rawRefreshToken: string | undefined,
): Promise<void> {
  if (!rawRefreshToken) return;
  await repo.deleteRefreshToken(hashToken(rawRefreshToken));
}

export function verifyAccessToken(token: string): JwtPayload {
  try {
    return jwt.verify(token, getJwtSecret()) as JwtPayload;
  } catch {
    throw new AuthorizationError("Invalid or expired access token");
  }
}
