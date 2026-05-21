import { query, getPool } from '../../db/client';
import { UserId, ItemId } from '../../types';

export interface SortOrderRow {
  item_id:    ItemId;
  sort_order: number;
}

export async function findSortOrders(userId: UserId, contextKey: string): Promise<SortOrderRow[]> {
  return query<SortOrderRow>(
    `SELECT item_id, sort_order FROM item_sort_orders
     WHERE user_id = $1 AND context_key = $2
     ORDER BY sort_order ASC`,
    [userId, contextKey]
  );
}

export async function upsertSortOrders(
  userId: UserId,
  contextKey: string,
  orderedItemIds: ItemId[]
): Promise<void> {
  if (orderedItemIds.length === 0) return;

  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Delete existing orders for this context
    await client.query(
      'DELETE FROM item_sort_orders WHERE user_id = $1 AND context_key = $2',
      [userId, contextKey]
    );

    // Insert new orders
    for (let i = 0; i < orderedItemIds.length; i++) {
      await client.query(
        `INSERT INTO item_sort_orders (user_id, context_key, item_id, sort_order)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, context_key, item_id) DO UPDATE SET sort_order = $4, updated_at = NOW()`,
        [userId, contextKey, orderedItemIds[i], i]
      );
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
