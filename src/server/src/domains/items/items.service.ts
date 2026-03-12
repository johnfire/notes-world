// Items domain service — business logic
// Full implementation in Phase 1.2
import { Item, ItemType, UserId, ItemId } from '../../types';
import { eventBus } from '../../events/eventBus';
import { LIMITS } from '../../constants';
import {
  ValidationError,
  NotFoundError,
  StateError,
  ConflictError,
  AuthorizationError,
} from '../../utils/errors';
import * as repo from './items.repository';
import { CaptureItemInput, UpdateItemInput, PromoteItemInput } from './items.types';

export async function captureItem(userId: UserId, input: CaptureItemInput): Promise<Item> {
  const title = input.title?.trim();
  if (!title) throw new ValidationError('Title is required');
  if (title.length > LIMITS.ITEM_TITLE_MAX) {
    throw new ValidationError('Title too long', { length: title.length, maximum: LIMITS.ITEM_TITLE_MAX });
  }
  if (input.body && input.body.length > LIMITS.ITEM_BODY_MAX) {
    throw new ValidationError('Body too long', { length: input.body.length, maximum: LIMITS.ITEM_BODY_MAX });
  }

  const item = await repo.insert(userId, title, input.body);
  eventBus.emit('ItemCaptured', { item, created_at: item.created_at });
  return item;
}

export async function getItemById(userId: UserId, id: ItemId): Promise<Item> {
  const item = await repo.findById(id, userId);
  if (!item) throw new NotFoundError('Item', id);
  return item;
}

export async function updateItem(
  userId: UserId,
  id: ItemId,
  input: UpdateItemInput
): Promise<Item> {
  const item = await repo.findById(id, userId);
  if (!item) throw new NotFoundError('Item', id);
  if (item.user_id !== userId) throw new AuthorizationError('Not owner');
  if (item.status !== 'Active') throw new StateError('Cannot update archived item');

  if (input.title !== undefined) {
    const title = input.title.trim();
    if (!title) throw new ValidationError('Title cannot be empty');
    if (title.length > LIMITS.ITEM_TITLE_MAX) {
      throw new ValidationError('Title too long', { length: title.length, maximum: LIMITS.ITEM_TITLE_MAX });
    }
  }

  const updated = await repo.update(id, userId, input);
  if (!updated) throw new NotFoundError('Item', id);
  eventBus.emit('ItemUpdated', { item: updated, updated_at: updated.updated_at });
  return updated;
}

export async function promoteItem(
  userId: UserId,
  id: ItemId,
  input: PromoteItemInput
): Promise<Item> {
  const item = await repo.findById(id, userId);
  if (!item) throw new NotFoundError('Item', id);
  if (item.user_id !== userId) throw new AuthorizationError('Not owner');
  if (item.status !== 'Active') throw new StateError('Cannot promote archived item');
  if (input.new_type === ItemType.Untyped) throw new ValidationError('Cannot promote to Untyped');

  const defaults = getTypeDefaults(input.new_type);
  const type_data = { ...defaults, ...(input.type_data ?? {}) };

  const updated = await repo.update(id, userId, {
    item_type: input.new_type,
    type_data,
  });
  if (!updated) throw new NotFoundError('Item', id);

  eventBus.emit('ItemPromoted', {
    item: updated,
    previous_type: item.item_type,
    new_type: input.new_type,
    promoted_at: updated.updated_at,
  });
  return updated;
}

export async function archiveItem(userId: UserId, id: ItemId): Promise<Item> {
  const item = await repo.findById(id, userId);
  if (!item) throw new NotFoundError('Item', id);
  if (item.user_id !== userId) throw new AuthorizationError('Not owner');
  if (item.status === 'Archived') throw new ConflictError('Item is already archived');

  const updated = await repo.update(id, userId, { status: 'Archived' });
  if (!updated) throw new NotFoundError('Item', id);
  eventBus.emit('ItemArchived', { item: updated, archived_at: updated.updated_at });
  return updated;
}

export async function restoreItem(userId: UserId, id: ItemId): Promise<Item> {
  const item = await repo.findById(id, userId);
  if (!item) throw new NotFoundError('Item', id);
  if (item.user_id !== userId) throw new AuthorizationError('Not owner');
  if (item.status !== 'Archived') throw new ConflictError('Item is not archived');

  const updated = await repo.update(id, userId, { status: 'Active' });
  if (!updated) throw new NotFoundError('Item', id);
  eventBus.emit('ItemRestored', { item: updated, restored_at: updated.updated_at });
  return updated;
}

export async function getRecentItems(userId: UserId, limit = 20): Promise<Item[]> {
  return repo.findActive(userId, limit);
}

export async function searchItems(userId: UserId, searchText: string, limit = 50, offset = 0): Promise<Item[]> {
  if (!searchText?.trim()) throw new ValidationError('Search text is required');
  return repo.search(userId, searchText.trim(), limit, offset);
}

export async function getItemsByType(userId: UserId, itemType: ItemType, limit = 50, offset = 0): Promise<Item[]> {
  return repo.findByType(userId, itemType, limit, offset);
}

export async function getItemsByTag(userId: UserId, tagId: string, limit = 50, offset = 0): Promise<Item[]> {
  return repo.findByTag(userId, tagId, limit, offset);
}

function getTypeDefaults(type: ItemType): Record<string, unknown> {
  switch (type) {
    case ItemType.Task:
      return { task_status: 'Open', priority: 'Normal' };
    case ItemType.Idea:
      return { maturity: 'Seed' };
    case ItemType.Note:
      return {};
    case ItemType.Reminder:
      return { is_dismissed: false };
    default:
      return {};
  }
}
