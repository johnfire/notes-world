import { ItemType, ItemStatus, TaskStatus, Priority } from '../../../../../packages/server/src/types';
import { makeItem, TEST_USER_ID, OTHER_USER_ID } from '../../../../helpers/itemFactory';

// ── Mock the repository before importing the service ──────────────────────────
jest.mock('../../../../../packages/server/src/domains/items/items.repository');
jest.mock('../../../../../packages/server/src/events/eventBus', () => ({
  eventBus: { emit: jest.fn() },
}));

import * as repo from '../../../../../packages/server/src/domains/items/items.repository';
import * as service from '../../../../../packages/server/src/domains/items/items.service';
import { eventBus } from '../../../../../packages/server/src/events/eventBus';

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

// ── inheritTypeFromTag ──────────────────────────────────────────────────────

describe('inheritTypeFromTag', () => {
  test('promotes an Untyped item to the tag\'s dominant type', async () => {
    const item     = makeItem({ item_type: ItemType.Untyped });
    const promoted = makeItem({ ...item, item_type: ItemType.Task });
    mockRepo.findDominantTypeForTag.mockResolvedValue(ItemType.Task);
    mockRepo.findById.mockResolvedValue(item); // re-fetched inside promoteItem
    mockRepo.update.mockResolvedValue(promoted);

    const result = await service.inheritTypeFromTag(TEST_USER_ID, item, 'tag-1');

    expect(mockRepo.findDominantTypeForTag).toHaveBeenCalledWith(TEST_USER_ID, 'tag-1', item.id);
    expect(mockRepo.update).toHaveBeenCalledWith(
      item.id, TEST_USER_ID,
      expect.objectContaining({
        item_type: ItemType.Task,
        type_data: expect.objectContaining({ task_status: 'Open', priority: 'Normal' }),
      }),
    );
    expect(result).toBe(promoted);
  });

  test('never overrides an already-typed item', async () => {
    const item = makeItem({ item_type: ItemType.Note });

    const result = await service.inheritTypeFromTag(TEST_USER_ID, item, 'tag-1');

    expect(mockRepo.findDominantTypeForTag).not.toHaveBeenCalled();
    expect(mockRepo.update).not.toHaveBeenCalled();
    expect(result).toBe(item);
  });

  test('no-op when the tag has no typed members to learn from', async () => {
    const item = makeItem({ item_type: ItemType.Untyped });
    mockRepo.findDominantTypeForTag.mockResolvedValue(null);

    const result = await service.inheritTypeFromTag(TEST_USER_ID, item, 'tag-1');

    expect(mockRepo.update).not.toHaveBeenCalled();
    expect(result).toBe(item);
  });

  test('skips an archived item', async () => {
    const item = makeItem({ item_type: ItemType.Untyped, status: ItemStatus.Archived });

    const result = await service.inheritTypeFromTag(TEST_USER_ID, item, 'tag-1');

    expect(mockRepo.findDominantTypeForTag).not.toHaveBeenCalled();
    expect(result).toBe(item);
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

    expect(mockRepo.update).toHaveBeenCalledWith(item.id, TEST_USER_ID, { status: 'Archived', archived_at: expect.any(String) });
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

    expect(mockRepo.update).toHaveBeenCalledWith(item.id, TEST_USER_ID, { status: 'Active', archived_at: null });
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

// ── setParent (hierarchy) ─────────────────────────────────────────────────────

describe('setParent', () => {
  test('clears the parent (un-nest) and emits ItemReparented', async () => {
    const item = makeItem();
    const cleared = makeItem({ id: item.id, parent_id: null });
    mockRepo.findById.mockResolvedValueOnce(item);
    mockRepo.update.mockResolvedValue(cleared);

    const result = await service.setParent(TEST_USER_ID, item.id, null);

    expect(mockRepo.update).toHaveBeenCalledWith(item.id, TEST_USER_ID, { parent_id: null });
    expect(result).toBe(cleared);
    expect(mockBus).toHaveBeenCalledWith('ItemReparented', expect.objectContaining({ parent_id: null }));
  });

  test('nests under a valid parent and emits ItemReparented', async () => {
    const item = makeItem();
    const parent = makeItem();
    const updated = makeItem({ id: item.id, parent_id: parent.id });
    mockRepo.findById.mockResolvedValueOnce(item).mockResolvedValueOnce(parent);
    mockRepo.findAncestorIds.mockResolvedValue([]); // parent is at the root
    mockRepo.subtreeHeight.mockResolvedValue(0);     // item is a leaf
    mockRepo.update.mockResolvedValue(updated);

    const result = await service.setParent(TEST_USER_ID, item.id, parent.id);

    expect(mockRepo.update).toHaveBeenCalledWith(item.id, TEST_USER_ID, { parent_id: parent.id });
    expect(result).toBe(updated);
    expect(mockBus).toHaveBeenCalledWith('ItemReparented', expect.objectContaining({ parent_id: parent.id }));
  });

  test('rejects making an item its own parent', async () => {
    const item = makeItem();
    mockRepo.findById.mockResolvedValueOnce(item);

    await expect(service.setParent(TEST_USER_ID, item.id, item.id))
      .rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(mockRepo.update).not.toHaveBeenCalled();
  });

  test('rejects a cycle (the proposed parent sits under the item)', async () => {
    const item = makeItem();
    const parent = makeItem();
    mockRepo.findById.mockResolvedValueOnce(item).mockResolvedValueOnce(parent);
    mockRepo.findAncestorIds.mockResolvedValue([item.id]); // item is above the parent

    await expect(service.setParent(TEST_USER_ID, item.id, parent.id))
      .rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(mockRepo.update).not.toHaveBeenCalled();
  });

  test('rejects nesting that would exceed the depth cap of 7', async () => {
    const item = makeItem();
    const parent = makeItem();
    mockRepo.findById.mockResolvedValueOnce(item).mockResolvedValueOnce(parent);
    // parent has 6 ancestors → it sits at level 7, so the item would land at 8
    mockRepo.findAncestorIds.mockResolvedValue(['a', 'b', 'c', 'd', 'e', 'f']);
    mockRepo.subtreeHeight.mockResolvedValue(0);

    await expect(service.setParent(TEST_USER_ID, item.id, parent.id))
      .rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(mockRepo.update).not.toHaveBeenCalled();
  });

  test('rejects reparenting an archived item', async () => {
    const item = makeItem({ status: ItemStatus.Archived });
    mockRepo.findById.mockResolvedValueOnce(item);

    await expect(service.setParent(TEST_USER_ID, item.id, '00000000-0000-0000-0000-0000000000ff'))
      .rejects.toMatchObject({ code: 'STATE_ERROR' });
    expect(mockRepo.update).not.toHaveBeenCalled();
  });
});
