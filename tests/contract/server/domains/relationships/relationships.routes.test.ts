import request from 'supertest';
import { makeItem, makeTag, TEST_USER_ID } from '../../../../helpers/itemFactory';

// ── Mock service and DB before importing the app ──────────────────────────────
jest.mock('../../../../../src/server/src/domains/relationships/relationships.service');
jest.mock('../../../../../src/server/src/db/client', () => ({
  getPool:         jest.fn(),
  query:           jest.fn(),
  queryOne:        jest.fn(),
  withTransaction: jest.fn(),
  closePool:       jest.fn(),
}));

import * as service from '../../../../../src/server/src/domains/relationships/relationships.service';
import { createApp } from '../../../../../src/server/src/app';

const mockService = service as jest.Mocked<typeof service>;
const app = createApp();

beforeEach(() => jest.clearAllMocks());

// ── GET /api/tags ─────────────────────────────────────────────────────────────

describe('GET /api/tags', () => {
  test('200 with all tags', async () => {
    const tags = [makeTag({ name: 'work' }), makeTag({ name: 'personal' })];
    mockService.getAllTags.mockResolvedValue(tags);

    const res = await request(app).get('/api/tags');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(mockService.getAllTags).toHaveBeenCalledWith(TEST_USER_ID);
  });
});

// ── GET /api/tags/usage ───────────────────────────────────────────────────────

describe('GET /api/tags/usage', () => {
  test('200 with tags and counts', async () => {
    const tags = [{ ...makeTag(), count: 3 }];
    mockService.getTagUsageCounts.mockResolvedValue(tags);

    const res = await request(app).get('/api/tags/usage');

    expect(res.status).toBe(200);
    expect(res.body[0].count).toBe(3);
    expect(mockService.getTagUsageCounts).toHaveBeenCalledWith(TEST_USER_ID);
  });
});

// ── POST /api/tags ────────────────────────────────────────────────────────────

describe('POST /api/tags', () => {
  test('201 with created tag', async () => {
    const tag = makeTag({ name: 'new-tag' });
    mockService.createTag.mockResolvedValue(tag);

    const res = await request(app).post('/api/tags').send({ name: 'new-tag' });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('new-tag');
    expect(mockService.createTag).toHaveBeenCalledWith(TEST_USER_ID, 'new-tag');
  });

  test('422 when name is empty', async () => {
    const { ValidationError } = await import('../../../../../src/server/src/utils/errors');
    mockService.createTag.mockRejectedValue(new ValidationError('Tag name is required'));

    const res = await request(app).post('/api/tags').send({ name: '' });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('409 when tag already exists', async () => {
    const { ConflictError } = await import('../../../../../src/server/src/utils/errors');
    mockService.createTag.mockRejectedValue(new ConflictError('Tag "work" already exists'));

    const res = await request(app).post('/api/tags').send({ name: 'work' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT_ERROR');
  });
});

// ── PATCH /api/tags/:id ───────────────────────────────────────────────────────

describe('PATCH /api/tags/:id', () => {
  test('200 with renamed tag', async () => {
    const tag = makeTag({ name: 'renamed' });
    mockService.renameTag.mockResolvedValue(tag);

    const res = await request(app)
      .patch(`/api/tags/${tag.id}`)
      .send({ new_name: 'renamed' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('renamed');
    expect(mockService.renameTag).toHaveBeenCalledWith(TEST_USER_ID, tag.id, 'renamed');
  });

  test('404 when tag not found', async () => {
    const { NotFoundError } = await import('../../../../../src/server/src/utils/errors');
    mockService.renameTag.mockRejectedValue(new NotFoundError('Tag', 'missing-id'));

    const res = await request(app)
      .patch('/api/tags/missing-id')
      .send({ new_name: 'x' });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  test('409 when new name conflicts', async () => {
    const { ConflictError } = await import('../../../../../src/server/src/utils/errors');
    mockService.renameTag.mockRejectedValue(new ConflictError('Tag already exists'));

    const res = await request(app)
      .patch('/api/tags/some-id')
      .send({ new_name: 'existing' });

    expect(res.status).toBe(409);
  });
});

// ── DELETE /api/tags/:id ──────────────────────────────────────────────────────

describe('DELETE /api/tags/:id', () => {
  test('204 on successful delete', async () => {
    mockService.deleteTag.mockResolvedValue(undefined);

    const res = await request(app).delete('/api/tags/some-id');

    expect(res.status).toBe(204);
    expect(mockService.deleteTag).toHaveBeenCalledWith(TEST_USER_ID, 'some-id');
  });

  test('404 when tag not found', async () => {
    const { NotFoundError } = await import('../../../../../src/server/src/utils/errors');
    mockService.deleteTag.mockRejectedValue(new NotFoundError('Tag', 'missing-id'));

    const res = await request(app).delete('/api/tags/missing-id');

    expect(res.status).toBe(404);
  });
});

// ── GET /api/tags/:id/items ───────────────────────────────────────────────────

describe('GET /api/tags/:id/items', () => {
  test('200 with items for tag', async () => {
    const items = [makeItem(), makeItem()];
    mockService.getItemsForTag.mockResolvedValue(items);

    const res = await request(app).get('/api/tags/tag-id-1/items');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(mockService.getItemsForTag).toHaveBeenCalledWith(TEST_USER_ID, 'tag-id-1', 50, 0);
  });

  test('respects limit and offset params', async () => {
    mockService.getItemsForTag.mockResolvedValue([]);

    await request(app).get('/api/tags/tag-id-1/items?limit=10&offset=5');

    expect(mockService.getItemsForTag).toHaveBeenCalledWith(TEST_USER_ID, 'tag-id-1', 10, 5);
  });
});

// ── GET /api/tags/item/:itemId ────────────────────────────────────────────────

describe('GET /api/tags/item/:itemId', () => {
  test('200 with tags for item', async () => {
    const tags = [makeTag()];
    mockService.getTagsForItem.mockResolvedValue(tags);

    const res = await request(app).get('/api/tags/item/item-id-1');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(mockService.getTagsForItem).toHaveBeenCalledWith(TEST_USER_ID, 'item-id-1');
  });
});

// ── POST /api/tags/item/:itemId/:tagId ────────────────────────────────────────

describe('POST /api/tags/item/:itemId/:tagId', () => {
  test('204 on successful tag', async () => {
    mockService.tagItem.mockResolvedValue(undefined);

    const res = await request(app).post('/api/tags/item/item-id-1/tag-id-1');

    expect(res.status).toBe(204);
    expect(mockService.tagItem).toHaveBeenCalledWith(TEST_USER_ID, 'item-id-1', 'tag-id-1');
  });

  test('404 when item not found', async () => {
    const { NotFoundError } = await import('../../../../../src/server/src/utils/errors');
    mockService.tagItem.mockRejectedValue(new NotFoundError('Item', 'missing'));

    const res = await request(app).post('/api/tags/item/missing/tag-id-1');

    expect(res.status).toBe(404);
  });

  test('422 when tag limit exceeded', async () => {
    const { LimitExceeded } = await import('../../../../../src/server/src/utils/errors');
    mockService.tagItem.mockRejectedValue(new LimitExceeded('Too many tags', { current_count: 20, maximum: 20 }));

    const res = await request(app).post('/api/tags/item/item-id-1/tag-id-1');

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('LIMIT_EXCEEDED');
  });
});

// ── DELETE /api/tags/item/:itemId/:tagId ──────────────────────────────────────

describe('DELETE /api/tags/item/:itemId/:tagId', () => {
  test('204 on successful untag', async () => {
    mockService.untagItem.mockResolvedValue(undefined);

    const res = await request(app).delete('/api/tags/item/item-id-1/tag-id-1');

    expect(res.status).toBe(204);
    expect(mockService.untagItem).toHaveBeenCalledWith(TEST_USER_ID, 'item-id-1', 'tag-id-1');
  });

  test('404 when item not found', async () => {
    const { NotFoundError } = await import('../../../../../src/server/src/utils/errors');
    mockService.untagItem.mockRejectedValue(new NotFoundError('Item', 'missing'));

    const res = await request(app).delete('/api/tags/item/missing/tag-id-1');

    expect(res.status).toBe(404);
  });
});
