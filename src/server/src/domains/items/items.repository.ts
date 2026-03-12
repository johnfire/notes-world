// Items repository — raw SQL queries
// Implemented in Phase 1.2
import { Item, ItemId, UserId, ItemType, ItemStatus } from '../../types';
import { query, queryOne, withTransaction } from '../../db/client';

export async function findById(id: ItemId, userId: UserId): Promise<Item | null> {
  return queryOne<Item>(
    'SELECT * FROM items WHERE id = $1 AND user_id = $2',
    [id, userId]
  );
}

export async function insert(
  userId: UserId,
  title: string,
  body?: string
): Promise<Item> {
  const rows = await query<Item>(
    `INSERT INTO items (user_id, title, body)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [userId, title, body ?? null]
  );
  return rows[0];
}

export async function update(
  id: ItemId,
  userId: UserId,
  fields: { title?: string; body?: string; type_data?: unknown; item_type?: string; status?: string }
): Promise<Item | null> {
  const sets: string[] = ['updated_at = NOW()'];
  const params: unknown[] = [];
  let i = 1;

  if (fields.title     !== undefined) { sets.push(`title = $${i++}`);     params.push(fields.title); }
  if (fields.body      !== undefined) { sets.push(`body = $${i++}`);      params.push(fields.body); }
  if (fields.type_data !== undefined) { sets.push(`type_data = $${i++}`); params.push(JSON.stringify(fields.type_data)); }
  if (fields.item_type !== undefined) { sets.push(`item_type = $${i++}`); params.push(fields.item_type); }
  if (fields.status    !== undefined) { sets.push(`status = $${i++}`);    params.push(fields.status); }

  params.push(id, userId);

  return queryOne<Item>(
    `UPDATE items SET ${sets.join(', ')} WHERE id = $${i++} AND user_id = $${i} RETURNING *`,
    params
  );
}

export async function findActive(
  userId: UserId,
  limit = 20
): Promise<Item[]> {
  return query<Item>(
    `SELECT * FROM items
     WHERE user_id = $1 AND status = $2
     ORDER BY updated_at DESC
     LIMIT $3`,
    [userId, ItemStatus.Active, limit]
  );
}

export async function findByType(
  userId: UserId,
  itemType: ItemType,
  limit = 50,
  offset = 0
): Promise<Item[]> {
  return query<Item>(
    `SELECT * FROM items
     WHERE user_id = $1 AND item_type = $2 AND status = $3
     ORDER BY created_at DESC
     LIMIT $4 OFFSET $5`,
    [userId, itemType, ItemStatus.Active, limit, offset]
  );
}

export async function search(
  userId: UserId,
  searchText: string,
  limit = 50,
  offset = 0
): Promise<Item[]> {
  return query<Item>(
    `SELECT *, ts_rank(
       to_tsvector('english', title || ' ' || COALESCE(body, '')),
       plainto_tsquery('english', $2)
     ) AS rank
     FROM items
     WHERE user_id = $1
       AND status = $3
       AND (
         to_tsvector('english', title || ' ' || COALESCE(body, ''))
           @@ plainto_tsquery('english', $2)
         OR title ILIKE $4
       )
     ORDER BY rank DESC, updated_at DESC
     LIMIT $5 OFFSET $6`,
    [userId, searchText, ItemStatus.Active, `%${searchText}%`, limit, offset]
  );
}

export async function findByTag(
  userId: UserId,
  tagId: string,
  limit = 50,
  offset = 0
): Promise<Item[]> {
  return query<Item>(
    `SELECT i.* FROM items i
     JOIN item_tags it ON it.item_id = i.id
     WHERE it.tag_id = $1
       AND i.user_id = $2
       AND i.status = $3
     ORDER BY LOWER(i.title) ASC
     LIMIT $4 OFFSET $5`,
    [tagId, userId, ItemStatus.Active, limit, offset]
  );
}

export async function findByEntryType(
  userId: UserId,
  entryType: string,
  limit = 50,
  offset = 0
): Promise<Item[]> {
  return query<Item>(
    `SELECT * FROM items
     WHERE user_id = $1 AND entry_type = $2 AND status = $3
     ORDER BY LOWER(title) ASC
     LIMIT $4 OFFSET $5`,
    [userId, entryType, ItemStatus.Active, limit, offset]
  );
}

export { withTransaction };
