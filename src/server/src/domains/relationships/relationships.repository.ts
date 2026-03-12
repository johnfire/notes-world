// Relationships repository — raw SQL queries for tags and item_tags
import { Tag, TagId, UserId, ItemId } from '../../types';
import { query, queryOne, getPool } from '../../db/client';
import { TagWithCount } from './relationships.types';

export async function findTagById(id: TagId, userId: UserId): Promise<Tag | null> {
  return queryOne<Tag>('SELECT * FROM tags WHERE id = $1 AND user_id = $2', [id, userId]);
}

export async function findTagByName(name: string, userId: UserId): Promise<Tag | null> {
  return queryOne<Tag>('SELECT * FROM tags WHERE name = $1 AND user_id = $2', [name, userId]);
}

export async function insertTag(name: string, userId: UserId): Promise<Tag> {
  const rows = await query<Tag>(
    'INSERT INTO tags (name, user_id) VALUES ($1, $2) RETURNING *',
    [name, userId]
  );
  return rows[0];
}

export async function updateTagName(id: TagId, userId: UserId, name: string): Promise<Tag | null> {
  return queryOne<Tag>(
    'UPDATE tags SET name = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3 RETURNING *',
    [name, id, userId]
  );
}

export async function deleteTag(id: TagId, userId: UserId): Promise<void> {
  await getPool().query('DELETE FROM tags WHERE id = $1 AND user_id = $2', [id, userId]);
}

export async function findAllTags(userId: UserId): Promise<Tag[]> {
  return query<Tag>('SELECT * FROM tags WHERE user_id = $1 ORDER BY name ASC', [userId]);
}

export async function findTagsForItem(itemId: ItemId, userId: UserId): Promise<Tag[]> {
  return query<Tag>(
    `SELECT t.* FROM tags t
     JOIN item_tags it ON it.tag_id = t.id
     WHERE it.item_id = $1 AND t.user_id = $2
     ORDER BY t.name ASC`,
    [itemId, userId]
  );
}

export async function findTagUsageCounts(userId: UserId): Promise<TagWithCount[]> {
  return query<TagWithCount>(
    `SELECT t.*, COUNT(it.id)::int AS count
     FROM tags t
     LEFT JOIN item_tags it ON it.tag_id = t.id
     WHERE t.user_id = $1
     GROUP BY t.id
     ORDER BY t.name ASC`,
    [userId]
  );
}

export async function countTagsOnItem(itemId: ItemId): Promise<number> {
  const rows = await query<{ count: string }>(
    'SELECT COUNT(*)::int AS count FROM item_tags WHERE item_id = $1',
    [itemId]
  );
  return parseInt(rows[0]?.count ?? '0', 10);
}

export async function itemTagExists(itemId: ItemId, tagId: TagId): Promise<boolean> {
  const row = await queryOne<{ exists: boolean }>(
    'SELECT EXISTS(SELECT 1 FROM item_tags WHERE item_id = $1 AND tag_id = $2) AS exists',
    [itemId, tagId]
  );
  return row?.exists ?? false;
}

export async function insertItemTag(itemId: ItemId, tagId: TagId, userId: UserId): Promise<void> {
  await query(
    'INSERT INTO item_tags (item_id, tag_id, user_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
    [itemId, tagId, userId]
  );
}

export async function deleteItemTag(itemId: ItemId, tagId: TagId): Promise<void> {
  await query('DELETE FROM item_tags WHERE item_id = $1 AND tag_id = $2', [itemId, tagId]);
}
