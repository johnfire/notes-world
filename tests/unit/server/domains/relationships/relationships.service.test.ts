import { makeItem, makeTag, TEST_USER_ID, OTHER_USER_ID } from '../../../../helpers/itemFactory';

// ── Mock repositories and eventBus before importing service ───────────────────
jest.mock('../../../../../src/server/src/domains/relationships/relationships.repository');
jest.mock('../../../../../src/server/src/domains/items/items.repository');
jest.mock('../../../../../src/server/src/events/eventBus', () => ({
  eventBus: { emit: jest.fn() },
}));

import * as repo     from '../../../../../src/server/src/domains/relationships/relationships.repository';
import * as itemRepo from '../../../../../src/server/src/domains/items/items.repository';
import * as service  from '../../../../../src/server/src/domains/relationships/relationships.service';
import { eventBus }  from '../../../../../src/server/src/events/eventBus';

const mockRepo     = repo     as jest.Mocked<typeof repo>;
const mockItemRepo = itemRepo as jest.Mocked<typeof itemRepo>;
const mockBus      = eventBus.emit as jest.Mock;

beforeEach(() => jest.clearAllMocks());

// ── createTag ─────────────────────────────────────────────────────────────────

describe('createTag', () => {
  test('creates tag and returns it', async () => {
    const tag = makeTag({ name: 'work' });
    mockRepo.findTagByName.mockResolvedValue(null);
    mockRepo.insertTag.mockResolvedValue(tag);

    const result = await service.createTag(TEST_USER_ID, 'work');

    expect(mockRepo.findTagByName).toHaveBeenCalledWith('work', TEST_USER_ID);
    expect(mockRepo.insertTag).toHaveBeenCalledWith('work', TEST_USER_ID);
    expect(result).toBe(tag);
  });

  test('normalizes name to lowercase and trimmed', async () => {
    const tag = makeTag({ name: 'urgent' });
    mockRepo.findTagByName.mockResolvedValue(null);
    mockRepo.insertTag.mockResolvedValue(tag);

    await service.createTag(TEST_USER_ID, '  URGENT  ');

    expect(mockRepo.findTagByName).toHaveBeenCalledWith('urgent', TEST_USER_ID);
    expect(mockRepo.insertTag).toHaveBeenCalledWith('urgent', TEST_USER_ID);
  });

  test('throws ValidationError when name is empty', async () => {
    await expect(service.createTag(TEST_USER_ID, ''))
      .rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(mockRepo.insertTag).not.toHaveBeenCalled();
  });

  test('throws ValidationError when name is whitespace only', async () => {
    await expect(service.createTag(TEST_USER_ID, '   '))
      .rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  test('throws ValidationError when name exceeds limit', async () => {
    const longName = 'a'.repeat(200);
    mockRepo.findTagByName.mockResolvedValue(null);
    await expect(service.createTag(TEST_USER_ID, longName))
      .rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  test('throws ConflictError when tag already exists', async () => {
    mockRepo.findTagByName.mockResolvedValue(makeTag({ name: 'work' }));

    await expect(service.createTag(TEST_USER_ID, 'work'))
      .rejects.toMatchObject({ code: 'CONFLICT_ERROR' });
    expect(mockRepo.insertTag).not.toHaveBeenCalled();
  });
});

// ── renameTag ─────────────────────────────────────────────────────────────────

describe('renameTag', () => {
  test('renames tag and returns updated', async () => {
    const tag     = makeTag({ name: 'old' });
    const updated = makeTag({ ...tag, name: 'new' });
    mockRepo.findTagById.mockResolvedValue(tag);
    mockRepo.findTagByName.mockResolvedValue(null);
    mockRepo.updateTagName.mockResolvedValue(updated);

    const result = await service.renameTag(TEST_USER_ID, tag.id, 'new');

    expect(mockRepo.updateTagName).toHaveBeenCalledWith(tag.id, TEST_USER_ID, 'new');
    expect(result).toBe(updated);
  });

  test('normalizes new name', async () => {
    const tag     = makeTag();
    const updated = makeTag({ ...tag, name: 'renamed' });
    mockRepo.findTagById.mockResolvedValue(tag);
    mockRepo.findTagByName.mockResolvedValue(null);
    mockRepo.updateTagName.mockResolvedValue(updated);

    await service.renameTag(TEST_USER_ID, tag.id, '  RENAMED  ');

    expect(mockRepo.updateTagName).toHaveBeenCalledWith(tag.id, TEST_USER_ID, 'renamed');
  });

  test('throws NotFoundError when tag missing', async () => {
    mockRepo.findTagById.mockResolvedValue(null);

    await expect(service.renameTag(TEST_USER_ID, 'x', 'new'))
      .rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  test('throws AuthorizationError when not owner', async () => {
    mockRepo.findTagById.mockResolvedValue(makeTag({ user_id: OTHER_USER_ID }));

    await expect(service.renameTag(TEST_USER_ID, 'x', 'new'))
      .rejects.toMatchObject({ code: 'AUTHORIZATION_ERROR' });
  });

  test('throws ValidationError when new name is empty', async () => {
    mockRepo.findTagById.mockResolvedValue(makeTag());

    await expect(service.renameTag(TEST_USER_ID, 'x', ''))
      .rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  test('throws ConflictError when new name is taken by different tag', async () => {
    const tag     = makeTag({ name: 'old' });
    const other   = makeTag({ name: 'taken' });
    mockRepo.findTagById.mockResolvedValue(tag);
    mockRepo.findTagByName.mockResolvedValue(other);

    await expect(service.renameTag(TEST_USER_ID, tag.id, 'taken'))
      .rejects.toMatchObject({ code: 'CONFLICT_ERROR' });
  });

  test('allows rename to same name (no conflict when same tag id)', async () => {
    const tag     = makeTag({ name: 'same' });
    const updated = makeTag({ ...tag });
    mockRepo.findTagById.mockResolvedValue(tag);
    mockRepo.findTagByName.mockResolvedValue(tag); // same id — no conflict
    mockRepo.updateTagName.mockResolvedValue(updated);

    await expect(service.renameTag(TEST_USER_ID, tag.id, 'same')).resolves.toBe(updated);
  });
});

// ── deleteTag ─────────────────────────────────────────────────────────────────

describe('deleteTag', () => {
  test('deletes tag and emits TagDeleted', async () => {
    const tag = makeTag();
    mockRepo.findTagById.mockResolvedValue(tag);
    mockRepo.deleteTag.mockResolvedValue(undefined);

    await service.deleteTag(TEST_USER_ID, tag.id);

    expect(mockRepo.deleteTag).toHaveBeenCalledWith(tag.id, TEST_USER_ID);
    expect(mockBus).toHaveBeenCalledWith('TagDeleted', expect.objectContaining({ tag_id: tag.id }));
  });

  test('throws NotFoundError when tag missing', async () => {
    mockRepo.findTagById.mockResolvedValue(null);

    await expect(service.deleteTag(TEST_USER_ID, 'x'))
      .rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  test('throws AuthorizationError when not owner', async () => {
    mockRepo.findTagById.mockResolvedValue(makeTag({ user_id: OTHER_USER_ID }));

    await expect(service.deleteTag(TEST_USER_ID, 'x'))
      .rejects.toMatchObject({ code: 'AUTHORIZATION_ERROR' });
  });
});

// ── getAllTags ─────────────────────────────────────────────────────────────────

describe('getAllTags', () => {
  test('returns all tags for user', async () => {
    const tags = [makeTag(), makeTag()];
    mockRepo.findAllTags.mockResolvedValue(tags);

    const result = await service.getAllTags(TEST_USER_ID);

    expect(result).toBe(tags);
    expect(mockRepo.findAllTags).toHaveBeenCalledWith(TEST_USER_ID);
  });
});

// ── getTagsForItem ────────────────────────────────────────────────────────────

describe('getTagsForItem', () => {
  test('returns tags for item', async () => {
    const tags = [makeTag()];
    mockRepo.findTagsForItem.mockResolvedValue(tags);

    const result = await service.getTagsForItem(TEST_USER_ID, 'item-id-1');

    expect(result).toBe(tags);
    expect(mockRepo.findTagsForItem).toHaveBeenCalledWith('item-id-1', TEST_USER_ID);
  });
});

// ── getTagUsageCounts ─────────────────────────────────────────────────────────

describe('getTagUsageCounts', () => {
  test('returns tags with usage counts', async () => {
    const tags = [{ ...makeTag(), count: 5 }];
    mockRepo.findTagUsageCounts.mockResolvedValue(tags);

    const result = await service.getTagUsageCounts(TEST_USER_ID);

    expect(result).toBe(tags);
    expect(mockRepo.findTagUsageCounts).toHaveBeenCalledWith(TEST_USER_ID);
  });
});

// ── tagItem ───────────────────────────────────────────────────────────────────

describe('tagItem', () => {
  test('tags item and emits ItemTagged', async () => {
    const item = makeItem();
    const tag  = makeTag();
    mockItemRepo.findById.mockResolvedValue(item);
    mockRepo.findTagById.mockResolvedValue(tag);
    mockRepo.countTagsOnItem.mockResolvedValue(0);
    mockRepo.insertItemTag.mockResolvedValue(undefined);

    await service.tagItem(TEST_USER_ID, item.id, tag.id);

    expect(mockRepo.insertItemTag).toHaveBeenCalledWith(item.id, tag.id, TEST_USER_ID);
    expect(mockBus).toHaveBeenCalledWith('ItemTagged', expect.objectContaining({ item, tag }));
  });

  test('throws NotFoundError when item missing', async () => {
    mockItemRepo.findById.mockResolvedValue(null);

    await expect(service.tagItem(TEST_USER_ID, 'x', 'y'))
      .rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  test('throws AuthorizationError when item not owned by user', async () => {
    mockItemRepo.findById.mockResolvedValue(makeItem({ user_id: OTHER_USER_ID }));

    await expect(service.tagItem(TEST_USER_ID, 'x', 'y'))
      .rejects.toMatchObject({ code: 'AUTHORIZATION_ERROR' });
  });

  test('throws NotFoundError when tag missing', async () => {
    mockItemRepo.findById.mockResolvedValue(makeItem());
    mockRepo.findTagById.mockResolvedValue(null);

    await expect(service.tagItem(TEST_USER_ID, 'x', 'y'))
      .rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  test('throws AuthorizationError when tag not owned by user', async () => {
    mockItemRepo.findById.mockResolvedValue(makeItem());
    mockRepo.findTagById.mockResolvedValue(makeTag({ user_id: OTHER_USER_ID }));

    await expect(service.tagItem(TEST_USER_ID, 'x', 'y'))
      .rejects.toMatchObject({ code: 'AUTHORIZATION_ERROR' });
  });

  test('throws LimitExceeded when item already has max tags', async () => {
    mockItemRepo.findById.mockResolvedValue(makeItem());
    mockRepo.findTagById.mockResolvedValue(makeTag());
    mockRepo.countTagsOnItem.mockResolvedValue(20); // assumes LIMITS.TAGS_PER_ITEM_MAX = 20

    await expect(service.tagItem(TEST_USER_ID, 'x', 'y'))
      .rejects.toMatchObject({ code: 'LIMIT_EXCEEDED' });
  });
});

// ── untagItem ─────────────────────────────────────────────────────────────────

describe('untagItem', () => {
  test('removes tag from item and emits ItemUntagged', async () => {
    const item = makeItem();
    const tag  = makeTag();
    mockItemRepo.findById.mockResolvedValue(item);
    mockRepo.deleteItemTag.mockResolvedValue(undefined);
    mockRepo.findTagById.mockResolvedValue(tag);

    await service.untagItem(TEST_USER_ID, item.id, tag.id);

    expect(mockRepo.deleteItemTag).toHaveBeenCalledWith(item.id, tag.id);
    expect(mockBus).toHaveBeenCalledWith('ItemUntagged', expect.objectContaining({ item, tag }));
  });

  test('throws NotFoundError when item missing', async () => {
    mockItemRepo.findById.mockResolvedValue(null);

    await expect(service.untagItem(TEST_USER_ID, 'x', 'y'))
      .rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  test('throws AuthorizationError when item not owned', async () => {
    mockItemRepo.findById.mockResolvedValue(makeItem({ user_id: OTHER_USER_ID }));

    await expect(service.untagItem(TEST_USER_ID, 'x', 'y'))
      .rejects.toMatchObject({ code: 'AUTHORIZATION_ERROR' });
  });
});

// ── getItemsForTag ────────────────────────────────────────────────────────────

describe('getItemsForTag', () => {
  test('returns items for tag with default pagination', async () => {
    const items = [makeItem()];
    mockItemRepo.findByTag.mockResolvedValue(items);

    const result = await service.getItemsForTag(TEST_USER_ID, 'tag-id-1');

    expect(result).toBe(items);
    expect(mockItemRepo.findByTag).toHaveBeenCalledWith(TEST_USER_ID, 'tag-id-1', 50, 0);
  });

  test('passes custom limit and offset', async () => {
    mockItemRepo.findByTag.mockResolvedValue([]);
    await service.getItemsForTag(TEST_USER_ID, 'tag-id-1', 10, 20);
    expect(mockItemRepo.findByTag).toHaveBeenCalledWith(TEST_USER_ID, 'tag-id-1', 10, 20);
  });
});

// ── findOrCreateTag ───────────────────────────────────────────────────────────

describe('findOrCreateTag', () => {
  test('returns existing tag if found', async () => {
    const tag = makeTag({ name: 'existing' });
    mockRepo.findTagByName.mockResolvedValue(tag);

    const result = await service.findOrCreateTag(TEST_USER_ID, 'existing');

    expect(result).toBe(tag);
    expect(mockRepo.insertTag).not.toHaveBeenCalled();
  });

  test('creates and returns tag when not found', async () => {
    const tag = makeTag({ name: 'new-tag' });
    mockRepo.findTagByName.mockResolvedValue(null);
    mockRepo.insertTag.mockResolvedValue(tag);

    const result = await service.findOrCreateTag(TEST_USER_ID, 'new-tag');

    expect(result).toBe(tag);
    expect(mockRepo.insertTag).toHaveBeenCalledWith('new-tag', TEST_USER_ID);
  });

  test('normalizes name before lookup', async () => {
    const tag = makeTag({ name: 'normalized' });
    mockRepo.findTagByName.mockResolvedValue(tag);

    await service.findOrCreateTag(TEST_USER_ID, '  NORMALIZED  ');

    expect(mockRepo.findTagByName).toHaveBeenCalledWith('normalized', TEST_USER_ID);
  });
});
