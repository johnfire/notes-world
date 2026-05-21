import { query, queryOne } from "../../db/client";
import { User } from "../../types";

export async function findUserByEmail(
  email: string,
): Promise<(User & { password_hash: string }) | null> {
  return queryOne<User & { password_hash: string }>(
    "SELECT * FROM users WHERE email = $1",
    [email],
  );
}

export async function findUserById(id: string): Promise<User | null> {
  return queryOne<User>(
    "SELECT id, email, created_at, updated_at FROM users WHERE id = $1",
    [id],
  );
}

export async function insertUser(
  email: string,
  passwordHash: string,
): Promise<User> {
  const rows = await query<User>(
    `INSERT INTO users (email, password_hash)
     VALUES ($1, $2)
     RETURNING id, email, created_at, updated_at`,
    [email, passwordHash],
  );
  return rows[0];
}

export async function insertRefreshToken(
  userId: string,
  tokenHash: string,
  expiresAt: Date,
): Promise<void> {
  await query(
    "INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)",
    [userId, tokenHash, expiresAt],
  );
}

export async function findRefreshToken(
  tokenHash: string,
): Promise<{ user_id: string; expires_at: Date } | null> {
  return queryOne<{ user_id: string; expires_at: Date }>(
    "SELECT user_id, expires_at FROM refresh_tokens WHERE token_hash = $1",
    [tokenHash],
  );
}

export async function deleteRefreshToken(tokenHash: string): Promise<void> {
  await query("DELETE FROM refresh_tokens WHERE token_hash = $1", [tokenHash]);
}

export async function deleteAllRefreshTokensForUser(
  userId: string,
): Promise<void> {
  await query("DELETE FROM refresh_tokens WHERE user_id = $1", [userId]);
}

export async function deleteExpiredRefreshTokens(): Promise<void> {
  await query("DELETE FROM refresh_tokens WHERE expires_at < now()");
}
