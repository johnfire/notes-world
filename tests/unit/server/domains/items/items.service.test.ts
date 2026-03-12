import { ItemType, ItemStatus, TaskStatus, Priority } from '../../../../../src/server/src/types';
import { makeItem, TEST_USER_ID, OTHER_USER_ID } from '../../../../helpers/itemFactory';

// ── Mock the repository before importing the service ──────────────────────────
jest.mock('../../../../../src/server/src/domains/items/items.repository');
jest.mock('../../../../../src/server/src/events/eventBus', () => ({
  eventBus: { emit: jest.fn() },
}));

import * as repo from '../../../../../src/server/src/domains/items/items.repository';
import * as service from '../../../../../src/server/src/domains/items/items.service';
import { eventBus } from '../../../../../src/server/src/events/eventBus';

const mockRepo = repo as jest.Mocked<typeof repo>;
const mockBus  = eventBus.emit as jest.Mock;

beforeEach(() => jest.clearAllMocks());

// ── captureItem ───────────────────────────────────────────────────────────────

describe('captureItem', () => {
  test('creates item and emits ItemCaptured', async () => {
    const created = makeItem({ title: 'Buy milk' });
    mockRepo.insert.mockResolvedValue(created);

    const result = await service.captureItem(TEST_USER_ID, { title: 'Buy milk' });

    expect(mockRepo.insert).toHaveBeenCalledWith(TEST_USER_ID, 'Buy milk', undefined);
    expect(result).toBe(created);
    expect(mockBus).toHaveBeenCalledWith('ItemCaptured', expect.objectContaining({ item: created }));
  });

  test('trims title whitespace', async () => {
    const created = makeItem({ title: 'trimmed' });
    mockRepo.insert.mockResolvedValue(created);

    await service.captureItem(TEST_USER_ID, { title: '  trimmed  ' });

    expect(mockRepo.insert).toHaveBeenCalledWith(TEST_USER_ID, 'trimmed', undefined);
  });

  test('passes optional body', async () => {
    const created = makeItem();
    mockRepo.insert.mockResolvedValue(created);

    await service.captureItem(TEST_USER_ID, { title: 'x', body: 'some details' });

    expect(mockRepo.insert).toHaveBeenCalledWith(TEST_USER_ID, 'x', 'some details');
  });

  test('throws ValidationError when title is empty', async () => {
    await expect(service.captureItem(TEST_USER_ID, { title: '' }))
      .rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(mockRepo.insert).not.toHaveBeenCalled();
  });

  test('throws ValidationError when title is whitespace only', async () => {
    await expect(service.captureItem(TEST_USER_ID, { title: '   ' }))
      .rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  test('throws ValidationError when title exceeds 300 chars', async () => {
    const longTitle = 'a'.repeat(301);
    await expect(service.captureItem(TEST_USER_ID, { title: longTitle }))
      .rejects.toMatchObject({ code: 'VALIDATION_ERROR', context: expect.objectContaining({ maximum: 300 }) });
  });

  test('throws ValidationError when body exceeds 50000 chars', async () => {
    const longBody = 'b'.repeat(50_001);
    await expect(service.captureItem(TEST_USER_ID, { title: 'ok', body: longBody }))
      .rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });
});

// ── getItemById ───────────────────────────────────────────────────────────────

describe('getItemById', () => {
  test('returns item when found', async () => {
    const item = makeItem();
    mockRepo.findById.mockResolvedValue(item);

    const result = await service.getItemById(TEST_USER_ID, item.id);
    expect(result).toBe(item);
  });

  test('throws NotFoundError when item does not exist', async () => {
    mockRepo.findById.mockResolvedValue(null);

    await expect(service.getItemById(TEST_USER_ID, 'missing-id'))
      .rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

// ── updateItem ────────────────────────────────────────────────────────────────

describe('updateItem', () => {
  test('updates title and emits ItemUpdated', async () => {
    const item    = makeItem();
    const updated = makeItem({ ...item, title: 'New title' });
    mockRepo.findById.mockResolvedValue(item);
    mockRepo.update.mockResolvedValue(updated);

    const result = await service.updateItem(TEST_USER_ID, item.id, { title: 'New title' });

    expect(result).toBe(updated);
    expect(mockBus).toHaveBeenCalledWith('ItemUpdated', expect.objectContaining({ item: updated }));
  });

  test('throws NotFoundError when item missing', async () => {
    mockRepo.findById.mockResolvedValue(null);

    await expect(service.updateItem(TEST_USER_ID, 'x', { title: 'y' }))
      .rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  test('throws StateError when item is archived', async () => {
    mockRepo.findById.mockResolvedValue(makeItem({ status: ItemStatus.Archived }));

    await expect(service.updateItem(TEST_USER_ID, 'x', { title: 'y' }))
      .rejects.toMatchObject({ code: 'STATE_ERROR' });
  });

  test('throws AuthorizationError when user is not owner', async () => {
    mockRepo.findById.mockResolvedValue(makeItem({ user_id: OTHER_USER_ID }));

    await expect(service.updateItem(TEST_USER_ID, 'x', { title: 'y' }))
      .rejects.toMatchObject({ code: 'AUTHORIZATION_ERROR' });
  });

  test('throws ValidationError when new title is empty', async () => {
    mockRepo.findById.mockResolvedValue(makeItem());

    await expect(service.updateItem(TEST_USER_ID, 'x', { title: '' }))
      .rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  test('throws ValidationError when new title exceeds 300 chars', async () => {
    mockRepo.findById.mockResolvedValue(makeItem());

    await expect(service.updateItem(TEST_USER_ID, 'x', { title: 'a'.repeat(301) }))
      .rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });
});

// ── promoteItem ───────────────────────────────────────────────────────────────

describe('promoteItem', () => {
  test('promotes Untyped to Task with defaults', async () => {
    const item    = makeItem({ item_type: ItemType.Untyped });
    const updated = makeItem({ ...item, item_type: ItemType.Task });
    mockRepo.findById.mockResolvedValue(item);
    mockRepo.update.mockResolvedValue(updated);

    const result = await service.promoteItem(TEST_USER_ID, item.id, { new_type: ItemType.Task });

    expect(mockRepo.update).toHaveBeenCalledWith(
      item.id, TEST_USER_ID,
      expect.objectContaining({
        item_type: ItemType.Task,
        type_data: expect.objectContaining({ task_status: 'Open', priority: 'Normal' }),
      })
    );
    expect(result).toBe(updated);
    expect(mockBus).toHaveBeenCalledWith('ItemPromoted', expect.objectContaining({
      previous_type: ItemType.Untyped,
      new_type: ItemType.Task,
    }));
  });

  test('promotes to Idea with Seed maturity default', async () => {
    const item    = makeItem();
    const updated = makeItem({ ...item, item_type: ItemType.Idea });
    mockRepo.findById.mockResolvedValue(item);
    mockRepo.update.mockResolvedValue(updated);

    await service.promoteItem(TEST_USER_ID, item.id, { new_type: ItemType.Idea });

    expect(mockRepo.update).toHaveBeenCalledWith(
      item.id, TEST_USER_ID,
      expect.objectContaining({ type_data: expect.objectContaining({ maturity: 'Seed' }) })
    );
  });

  test('promotes to Note', async () => {
    const item = makeItem();
    mockRepo.findById.mockResolvedValue(item);
    mockRepo.update.mockResolvedValue(makeItem({ ...item, item_type: ItemType.Note }));

    await service.promoteItem(TEST_USER_ID, item.id, { new_type: ItemType.Note });
    expect(mockRepo.update).toHaveBeenCalled();
  });

  test('promotes to Reminder', async () => {
    const item = makeItem();
    mockRepo.findById.mockResolvedValue(item);
    mockRepo.update.mockResolvedValue(makeItem({ ...item, item_type: ItemType.Reminder }));

    await service.promoteItem(TEST_USER_ID, item.id, { new_type: ItemType.Reminder });
    expect(mockRepo.update).toHaveBeenCalledWith(
      item.id, TEST_USER_ID,
      expect.objectContaining({ type_data: expect.objectContaining({ is_dismissed: false }) })
    );
  });

  test('merges provided type_data with defaults', async () => {
    const item = makeItem();
    mockRepo.findById.mockResolvedValue(item);
    mockRepo.update.mockResolvedValue(makeItem({ ...item, item_type: ItemType.Task }));

    await service.promoteItem(TEST_USER_ID, item.id, {
      new_type:  ItemType.Task,
      type_data: { task_status: TaskStatus.Open, priority: Priority.High, due_date: '2026-12-01', completed_at: undefined },
    });

    expect(mockRepo.update).toHaveBeenCalledWith(
      item.id, TEST_USER_ID,
      expect.objectContaining({ type_data: expect.objectContaining({ priority: 'High' }) })
    );
  });

  test('throws ValidationError when new_type is Untyped', async () => {
    mockRepo.findById.mockResolvedValue(makeItem());

    await expect(service.promoteItem(TEST_USER_ID, 'x', { new_type: ItemType.Untyped }))
      .rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  test('throws StateError when item is archived', async () => {
    mockRepo.findById.mockResolvedValue(makeItem({ status: ItemStatus.Archived }));

    await expect(service.promoteItem(TEST_USER_ID, 'x', { new_type: ItemType.Task }))
      .rejects.toMatchObject({ code: 'STATE_ERROR' });
  });

  test('throws AuthorizationError when user is not owner', async () => {
    mockRepo.findById.mockResolvedValue(makeItem({ user_id: OTHER_USER_ID }));

    await expect(service.promoteItem(TEST_USER_ID, 'x', { new_type: ItemType.Task }))
      .rejects.toMatchObject({ code: 'AUTHORIZATION_ERROR' });
  });

  test('throws NotFoundError when item missing', async () => {
    mockRepo.findById.mockResolvedValue(null);

    await expect(service.promoteItem(TEST_USER_ID, 'x', { new_type: ItemType.Task }))
      .rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

// ── archiveItem ───────────────────────────────────────────────────────────────

describe('archiveItem', () => {
  test('archives active item and emits ItemArchived', async () => {
    const item    = makeItem();
    const updated = makeItem({ ...item, status: ItemStatus.Archived });
    mockRepo.findById.mockResolvedValue(item);
    mockRepo.update.mockResolvedValue(updated);

    await service.archiveItem(TEST_USER_ID, item.id);

    expect(mockRepo.update).toHaveBeenCalledWith(item.id, TEST_USER_ID, { status: 'Archived' });
    expect(mockBus).toHaveBeenCalledWith('ItemArchived', expect.objectContaining({ item: updated }));
  });

  test('throws ConflictError when already archived', async () => {
    mockRepo.findById.mockResolvedValue(makeItem({ status: ItemStatus.Archived }));

    await expect(service.archiveItem(TEST_USER_ID, 'x'))
      .rejects.toMatchObject({ code: 'CONFLICT_ERROR' });
  });

  test('throws AuthorizationError when not owner', async () => {
    mockRepo.findById.mockResolvedValue(makeItem({ user_id: OTHER_USER_ID }));

    await expect(service.archiveItem(TEST_USER_ID, 'x'))
      .rejects.toMatchObject({ code: 'AUTHORIZATION_ERROR' });
  });

  test('throws NotFoundError when item missing', async () => {
    mockRepo.findById.mockResolvedValue(null);

    await expect(service.archiveItem(TEST_USER_ID, 'x'))
      .rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

// ── restoreItem ───────────────────────────────────────────────────────────────

describe('restoreItem', () => {
  test('restores archived item and emits ItemRestored', async () => {
    const item    = makeItem({ status: ItemStatus.Archived });
    const updated = makeItem({ status: ItemStatus.Active });
    mockRepo.findById.mockResolvedValue(item);
    mockRepo.update.mockResolvedValue(updated);

    await service.restoreItem(TEST_USER_ID, item.id);

    expect(mockRepo.update).toHaveBeenCalledWith(item.id, TEST_USER_ID, { status: 'Active' });
    expect(mockBus).toHaveBeenCalledWith('ItemRestored', expect.objectContaining({ item: updated }));
  });

  test('throws ConflictError when item is not archived', async () => {
    mockRepo.findById.mockResolvedValue(makeItem({ status: ItemStatus.Active }));

    await expect(service.restoreItem(TEST_USER_ID, 'x'))
      .rejects.toMatchObject({ code: 'CONFLICT_ERROR' });
  });

  test('throws AuthorizationError when not owner', async () => {
    mockRepo.findById.mockResolvedValue(makeItem({ user_id: OTHER_USER_ID, status: ItemStatus.Archived }));

    await expect(service.restoreItem(TEST_USER_ID, 'x'))
      .rejects.toMatchObject({ code: 'AUTHORIZATION_ERROR' });
  });
});

// ── searchItems ───────────────────────────────────────────────────────────────

describe('searchItems', () => {
  test('returns search results', async () => {
    const items = [makeItem({ title: 'Buy milk' })];
    mockRepo.search.mockResolvedValue(items);

    const result = await service.searchItems(TEST_USER_ID, 'milk');
    expect(result).toBe(items);
    expect(mockRepo.search).toHaveBeenCalledWith(TEST_USER_ID, 'milk', 50, 0);
  });

  test('trims search text', async () => {
    mockRepo.search.mockResolvedValue([]);
    await service.searchItems(TEST_USER_ID, '  milk  ');
    expect(mockRepo.search).toHaveBeenCalledWith(TEST_USER_ID, 'milk', 50, 0);
  });

  test('throws ValidationError when query is empty', async () => {
    await expect(service.searchItems(TEST_USER_ID, ''))
      .rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(mockRepo.search).not.toHaveBeenCalled();
  });

  test('throws ValidationError when query is whitespace only', async () => {
    await expect(service.searchItems(TEST_USER_ID, '   '))
      .rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });
});

// ── getRecentItems ────────────────────────────────────────────────────────────

describe('getRecentItems', () => {
  test('returns recent items with default limit 20', async () => {
    const items = [makeItem(), makeItem()];
    mockRepo.findActive.mockResolvedValue(items);

    const result = await service.getRecentItems(TEST_USER_ID);
    expect(result).toBe(items);
    expect(mockRepo.findActive).toHaveBeenCalledWith(TEST_USER_ID, 20);
  });

  test('passes custom limit', async () => {
    mockRepo.findActive.mockResolvedValue([]);
    await service.getRecentItems(TEST_USER_ID, 5);
    expect(mockRepo.findActive).toHaveBeenCalledWith(TEST_USER_ID, 5);
  });
});

// ── getItemsByType ────────────────────────────────────────────────────────────

describe('getItemsByType', () => {
  test('returns items of given type', async () => {
    const items = [makeItem({ item_type: ItemType.Task })];
    mockRepo.findByType.mockResolvedValue(items);

    const result = await service.getItemsByType(TEST_USER_ID, ItemType.Task);
    expect(result).toBe(items);
    expect(mockRepo.findByType).toHaveBeenCalledWith(TEST_USER_ID, ItemType.Task, 50, 0);
  });
});

// ── getItemsByTag ─────────────────────────────────────────────────────────────

describe('getItemsByTag', () => {
  test('delegates to findByTag', async () => {
    const items = [makeItem()];
    mockRepo.findByTag.mockResolvedValue(items);

    const result = await service.getItemsByTag(TEST_USER_ID, 'tag-id-1');
    expect(result).toBe(items);
    expect(mockRepo.findByTag).toHaveBeenCalledWith(TEST_USER_ID, 'tag-id-1', 50, 0);
  });
});
