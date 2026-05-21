import { UserId, ItemId } from '../../types';
import { ValidationError } from '../../utils/errors';
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
  await repo.upsertSortOrders(userId, contextKey, orderedItemIds);
}
