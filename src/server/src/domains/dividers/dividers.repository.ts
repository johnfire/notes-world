import { query, queryOne } from '../../db/client';
import { UserId } from '../../types';

export interface DividerRow {
  id:         string;
  user_id:    string;
  label:      string | null;
  created_at: string;
  updated_at: string;
}

export async function insertDivider(userId: UserId, label: string | null): Promise<DividerRow> {
  const row = await queryOne<DividerRow>(
    `INSERT INTO dividers (user_id, label)
     VALUES ($1, $2)
     RETURNING *`,
    [userId, label ?? null]
  );
  return row!;
}

export async function findDividersByUser(userId: UserId): Promise<DividerRow[]> {
  return query<DividerRow>(
    `SELECT * FROM dividers WHERE user_id = $1 ORDER BY created_at ASC`,
    [userId]
  );
}

export async function findDividerById(id: string, userId: UserId): Promise<DividerRow | null> {
  const rows = await query<DividerRow>(
    `SELECT * FROM dividers WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
  return rows[0] ?? null;
}

export async function updateDivider(id: string, userId: UserId, label: string | null): Promise<DividerRow> {
  const row = await queryOne<DividerRow>(
    `UPDATE dividers SET label = $1, updated_at = NOW()
     WHERE id = $2 AND user_id = $3
     RETURNING *`,
    [label ?? null, id, userId]
  );
  return row!;
}

export async function deleteDivider(id: string, userId: UserId): Promise<void> {
  await query(
    `DELETE FROM dividers WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
}
