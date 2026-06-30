import { UserId, ItemId } from '../../types';
import { ValidationError } from '../../utils/errors';
import { LIMITS } from '../../constants';
import * as repo from './sort-orders.repository';
import { SortOrderRow } from './sort-orders.repository';

export async function getSortOrders(userId: UserId, contextKey: string): Promise<SortOrderRow[]> {
  if (!contextKey) throw new ValidationError('contextKey is required');
  return repo.findSortOrders(userId, contextKey);
}

export async function saveSortOrders(
  userId: UserId,
  contextKey: string,
  orderedItemIds: ItemId[]
): Promise<void> {
  if (!contextKey) throw new ValidationError('contextKey is required');
  if (!Array.isArray(orderedItemIds)) throw new ValidationError('item_ids must be an array');
  // Sort-order ids are opaque strings (item UUIDs, "divider:*", encoded flags),
  // so they can't be ownership-checked against a single table. Rows are keyed by
  // user_id (no cross-user reach), so the only real risk is unbounded growth —
  // bound the count and per-id length, and drop duplicates.
  if (orderedItemIds.length > LIMITS.SORT_ORDER_IDS_MAX) {
    throw new ValidationError('Too many item_ids', {
      length: orderedItemIds.length,
      maximum: LIMITS.SORT_ORDER_IDS_MAX,
    });
  }
  for (const id of orderedItemIds) {
    if (typeof id !== 'string' || id.length > LIMITS.SORT_ORDER_ID_MAX) {
      throw new ValidationError('Invalid item_id in sort order');
    }
  }
  const deduped = [...new Set(orderedItemIds)];
  await repo.upsertSortOrders(userId, contextKey, deduped);
}
