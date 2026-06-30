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

const USER_SAFE_COLS =
  "id, email, role, disabled, stripe_subscription_status, trial_ends_at, created_at, updated_at";

export async function findUserById(id: string): Promise<User | null> {
  return queryOne<User>(`SELECT ${USER_SAFE_COLS} FROM users WHERE id = $1`, [
    id,
  ]);
}

export async function findUserByIdFull(
  id: string,
): Promise<(User & { password_hash: string }) | null> {
  return queryOne<User & { password_hash: string }>(
    "SELECT * FROM users WHERE id = $1",
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
     RETURNING ${USER_SAFE_COLS}`,
    [email, passwordHash],
  );
  return rows[0];
}

export async function updateUserRole(
  userId: string,
  role: string,
): Promise<User> {
  const rows = await query<User>(
    `UPDATE users SET role = $1, updated_at = now()
     WHERE id = $2
     RETURNING ${USER_SAFE_COLS}`,
    [role, userId],
  );
  return rows[0];
}

export async function setUserDisabled(
  userId: string,
  disabled: boolean,
): Promise<User | null> {
  return queryOne<User>(
    `UPDATE users SET disabled = $1, updated_at = now()
     WHERE id = $2
     RETURNING ${USER_SAFE_COLS}`,
    [disabled, userId],
  );
}

export async function updateUserStripe(
  userId: string,
  data: {
    stripe_customer_id?: string;
    stripe_subscription_id?: string | null;
    stripe_subscription_status?: string | null;
    role?: string;
    trial_ends_at?: Date | null;
  },
): Promise<void> {
  const sets: string[] = [];
  const params: unknown[] = [];
  let i = 1;
  if (data.stripe_customer_id !== undefined) {
    sets.push(`stripe_customer_id = $${i++}`);
    params.push(data.stripe_customer_id);
  }
  if (data.stripe_subscription_id !== undefined) {
    sets.push(`stripe_subscription_id = $${i++}`);
    params.push(data.stripe_subscription_id);
  }
  if (data.stripe_subscription_status !== undefined) {
    sets.push(`stripe_subscription_status = $${i++}`);
    params.push(data.stripe_subscription_status);
  }
  if (data.role !== undefined) {
    sets.push(`role = $${i++}`);
    params.push(data.role);
  }
  if (data.trial_ends_at !== undefined) {
    sets.push(`trial_ends_at = $${i++}`);
    params.push(data.trial_ends_at);
  }
  if (sets.length === 0) return;
  sets.push("updated_at = now()");
  params.push(userId);
  await query(`UPDATE users SET ${sets.join(", ")} WHERE id = $${i}`, params);
}

export async function listAllUsers(): Promise<User[]> {
  return query<User>(
    `SELECT ${USER_SAFE_COLS} FROM users ORDER BY created_at DESC`,
  );
}

export async function findUserByStripeCustomerId(
  customerId: string,
): Promise<User | null> {
  return queryOne<User>(
    `SELECT ${USER_SAFE_COLS} FROM users WHERE stripe_customer_id = $1`,
    [customerId],
  );
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

export async function updateUserEmail(
  userId: string,
  email: string,
): Promise<User> {
  const rows = await query<User>(
    `UPDATE users SET email = $1, updated_at = now()
     WHERE id = $2
     RETURNING ${USER_SAFE_COLS}`,
    [email, userId],
  );
  return rows[0];
}

export async function updateUserPasswordHash(
  userId: string,
  passwordHash: string,
): Promise<void> {
  await query(
    "UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2",
    [passwordHash, userId],
  );
}

export async function deleteUser(userId: string): Promise<void> {
  await query("DELETE FROM users WHERE id = $1", [userId]);
}

// ── API Keys ──────────────────────────────────────────────────────────────────

export type ApiKeyRow = {
  user_id: string;
  name: string;
  key_prefix: string;
  created_at: string;
};

export async function insertApiKey(
  userId: string,
  keyHash: string,
  keyPrefix: string,
  name: string,
): Promise<ApiKeyRow> {
  const row = await queryOne<ApiKeyRow>(
    `INSERT INTO user_api_keys (key_hash, user_id, key_prefix, name)
     VALUES ($1, $2, $3, $4)
     RETURNING user_id, name, key_prefix, created_at`,
    [keyHash, userId, keyPrefix, name],
  );
  return row!;
}

// Joins users so the auth middleware can reject keys belonging to a disabled
// account — API keys have no TTL, so without this a disabled user keeps access
// indefinitely.
export async function findApiKeyByHash(
  keyHash: string,
): Promise<{ user_id: string; disabled: boolean } | null> {
  return queryOne<{ user_id: string; disabled: boolean }>(
    `SELECT k.user_id, u.disabled
     FROM user_api_keys k
     JOIN users u ON u.id = k.user_id
     WHERE k.key_hash = $1`,
    [keyHash],
  );
}

export async function listApiKeys(userId: string): Promise<ApiKeyRow[]> {
  return query<ApiKeyRow>(
    "SELECT user_id, name, key_prefix, created_at FROM user_api_keys WHERE user_id = $1 ORDER BY created_at DESC",
    [userId],
  );
}

export async function deleteApiKeyByPrefix(
  keyPrefix: string,
  userId: string,
): Promise<boolean> {
  const rows = await query<{ key_prefix: string }>(
    "DELETE FROM user_api_keys WHERE key_prefix = $1 AND user_id = $2 RETURNING key_prefix",
    [keyPrefix, userId],
  );
  return rows.length > 0;
}
