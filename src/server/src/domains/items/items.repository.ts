// Items repository — raw SQL queries
// Implemented in Phase 1.2
import { Item, ItemId, UserId, ItemType, ItemStatus } from '../../types';
import { query, queryOne, withTransaction } from '../../db/client';
import { buildUpdate } from '../../utils/buildUpdate';

export async function findById(id: ItemId, userId: UserId): Promise<Item | null> {
  return queryOne<Item>(
    'SELECT * FROM items WHERE id = $1 AND user_id = $2',
    [id, userId]
  );
}

export async function insert(
  userId: UserId,
  title: string,
  body?: string,
  itemType?: ItemType
): Promise<Item> {
  const rows = await query<Item>(
    `INSERT INTO items (user_id, title, body, item_type)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [userId, title, body ?? null, itemType ?? ItemType.Untyped]
  );
  return rows[0];
}

export async function update(
  id: ItemId,
  userId: UserId,
  fields: { title?: string; body?: string; type_data?: unknown; item_type?: string; status?: string; archived_at?: string | null; color?: string | null }
): Promise<Item | null> {
  const { sql, params } = buildUpdate(
    'items',
    fields,
    { id, user_id: userId },
    { jsonFields: ['type_data'] }
  );
  return queryOne<Item>(sql, params);
}

export async function findActive(
  userId: UserId,
  limit = 20
): Promise<Item[]> {
  return query<Item>(
    `SELECT * FROM items
     WHERE user_id = $1 AND status = $2 AND item_type != $3
     ORDER BY updated_at DESC
     LIMIT $4`,
    [userId, ItemStatus.Active, ItemType.Divider, limit]
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
       AND item_type != 'Divider'
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
     LEFT JOIN item_sort_orders iso
       ON iso.item_id = i.id::text
       AND iso.user_id = $2
       AND iso.context_key = $5
     WHERE it.tag_id = $1
       AND i.user_id = $2
       AND i.status = $3
     ORDER BY iso.sort_order ASC NULLS LAST, LOWER(i.title) ASC
     LIMIT $4 OFFSET $6`,
    [tagId, userId, ItemStatus.Active, limit, `tag:${tagId}`, offset]
  );
}

export async function findUntagged(
  userId: UserId,
  limit = 1000,
  offset = 0
): Promise<Item[]> {
  return query<Item>(
    `SELECT i.* FROM items i
     LEFT JOIN item_tags it ON it.item_id = i.id
     WHERE i.user_id = $1
       AND i.status = $2
       AND i.item_type != $3
       AND it.id IS NULL
     ORDER BY LOWER(i.title) ASC
     LIMIT $4 OFFSET $5`,
    [userId, ItemStatus.Active, ItemType.Divider, limit, offset]
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

export async function findArchived(
  userId: UserId,
  limit = 50,
  offset = 0
): Promise<Item[]> {
  return query<Item>(
    `SELECT * FROM items
     WHERE user_id = $1 AND status = 'Archived' AND item_type != $2
     ORDER BY archived_at DESC NULLS LAST
     LIMIT $3 OFFSET $4`,
    [userId, ItemType.Divider, limit, offset]
  );
}

export async function purgeExpired(userId: UserId, days = 30): Promise<number> {
  const rows = await query<{ id: string }>(
    `DELETE FROM items
     WHERE user_id = $1
       AND status = 'Archived'
       AND archived_at IS NOT NULL
       AND archived_at < NOW() - INTERVAL '1 day' * $2
     RETURNING id`,
    [userId, days]
  );
  return rows.length;
}

export async function hardDelete(id: ItemId, userId: UserId): Promise<boolean> {
  const rows = await query<{ id: string }>(
    `DELETE FROM items WHERE id = $1 AND user_id = $2 AND status = 'Archived' RETURNING id`,
    [id, userId]
  );
  return rows.length > 0;
}

export { withTransaction };
