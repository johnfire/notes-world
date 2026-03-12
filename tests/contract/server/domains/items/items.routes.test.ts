import request from 'supertest';
import { ItemType, ItemStatus } from '../../../../../src/server/src/types';
import { makeItem, TEST_USER_ID } from '../../../../helpers/itemFactory';

// ── Mock service and DB before importing the app ──────────────────────────────
jest.mock('../../../../../src/server/src/domains/items/items.service');
jest.mock('../../../../../src/server/src/db/client', () => ({
  getPool:         jest.fn(),
  query:           jest.fn(),
  queryOne:        jest.fn(),
  withTransaction: jest.fn(),
  closePool:       jest.fn(),
}));

import * as service from '../../../../../src/server/src/domains/items/items.service';
import { createApp } from '../../../../../src/server/src/app';

const mockService = service as jest.Mocked<typeof service>;
const app = createApp();

beforeEach(() => jest.clearAllMocks());

// ── POST /api/items ───────────────────────────────────────────────────────────

describe('POST /api/items', () => {
  test('201 with created item', async () => {
    const item = makeItem({ title: 'Hello world' });
    mockService.captureItem.mockResolvedValue(item);

    const res = await request(app)
      .post('/api/items')
      .send({ title: 'Hello world' });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Hello world');
    expect(res.body.id).toBeDefined();
  });

  test('422 when title is missing', async () => {
    const { ValidationError } = await import('../../../../../src/server/src/utils/errors');
    mockService.captureItem.mockRejectedValue(new ValidationError('Title is required'));

    const res = await request(app).post('/api/items').send({});
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('422 when title is too long', async () => {
    const { ValidationError } = await import('../../../../../src/server/src/utils/errors');
    mockService.captureItem.mockRejectedValue(
      new ValidationError('Title too long', { length: 301, maximum: 300 })
    );

    const res = await request(app).post('/api/items').send({ title: 'a'.repeat(301) });
    expect(res.status).toBe(422);
    expect(res.body.error.context.maximum).toBe(300);
  });
});

// ── GET /api/items/search ─────────────────────────────────────────────────────

describe('GET /api/items/search', () => {
  test('200 with results', async () => {
    const items = [makeItem({ title: 'Buy milk' }), makeItem({ title: 'Buy eggs' })];
    mockService.searchItems.mockResolvedValue(items);

    const res = await request(app).get('/api/items/search?q=buy');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  test('422 when query is empty', async () => {
    const { ValidationError } = await import('../../../../../src/server/src/utils/errors');
    mockService.searchItems.mockRejectedValue(new ValidationError('Search text is required'));

    const res = await request(app).get('/api/items/search?q=');
    expect(res.status).toBe(422);
  });
});

// ── GET /api/items/recent ─────────────────────────────────────────────────────

describe('GET /api/items/recent', () => {
  test('200 with recent items', async () => {
    const items = [makeItem(), makeItem()];
    mockService.getRecentItems.mockResolvedValue(items);

    const res = await request(app).get('/api/items/recent');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  test('respects limit query param', async () => {
    mockService.getRecentItems.mockResolvedValue([]);
    await request(app).get('/api/items/recent?limit=5');
    expect(mockService.getRecentItems).toHaveBeenCalledWith(TEST_USER_ID, 5);
  });

  test('caps limit at MAX_PAGE_SIZE', async () => {
    mockService.getRecentItems.mockResolvedValue([]);
    await request(app).get('/api/items/recent?limit=99999');
    const [, calledLimit] = mockService.getRecentItems.mock.calls[0];
    expect(calledLimit).toBeLessThanOrEqual(200);
  });
});

// ── GET /api/items/type/:type ─────────────────────────────────────────────────

describe('GET /api/items/type/:type', () => {
  test('200 with typed items', async () => {
    const items = [makeItem({ item_type: ItemType.Task })];
    mockService.getItemsByType.mockResolvedValue(items);

    const res = await request(app).get('/api/items/type/Task');
    expect(res.status).toBe(200);
    expect(res.body[0].item_type).toBe('Task');
  });
});

// ── GET /api/items/:id ────────────────────────────────────────────────────────

describe('GET /api/items/:id', () => {
  test('200 with item', async () => {
    const item = makeItem();
    mockService.getItemById.mockResolvedValue(item);

    const res = await request(app).get(`/api/items/${item.id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(item.id);
  });

  test('404 when not found', async () => {
    const { NotFoundError } = await import('../../../../../src/server/src/utils/errors');
    mockService.getItemById.mockRejectedValue(new NotFoundError('Item', 'missing-id'));

    const res = await request(app).get('/api/items/missing-id');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

// ── PATCH /api/items/:id ──────────────────────────────────────────────────────

describe('PATCH /api/items/:id', () => {
  test('200 with updated item', async () => {
    const item = makeItem({ title: 'Updated' });
    mockService.updateItem.mockResolvedValue(item);

    const res = await request(app)
      .patch(`/api/items/${item.id}`)
      .send({ title: 'Updated' });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Updated');
  });

  test('422 when item is archived', async () => {
    const { StateError } = await import('../../../../../src/server/src/utils/errors');
    mockService.updateItem.mockRejectedValue(new StateError('Cannot update archived item'));

    const res = await request(app).patch('/api/items/x').send({ title: 'y' });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('STATE_ERROR');
  });

  test('403 when not owner', async () => {
    const { AuthorizationError } = await import('../../../../../src/server/src/utils/errors');
    mockService.updateItem.mockRejectedValue(new AuthorizationError('Not owner'));

    const res = await request(app).patch('/api/items/x').send({ title: 'y' });
    expect(res.status).toBe(403);
  });
});

// ── POST /api/items/:id/promote ───────────────────────────────────────────────

describe('POST /api/items/:id/promote', () => {
  test('200 with promoted item', async () => {
    const item = makeItem({ item_type: ItemType.Task });
    mockService.promoteItem.mockResolvedValue(item);

    const res = await request(app)
      .post(`/api/items/${item.id}/promote`)
      .send({ new_type: 'Task' });

    expect(res.status).toBe(200);
    expect(res.body.item_type).toBe('Task');
  });

  test('422 when promoting to Untyped', async () => {
    const { ValidationError } = await import('../../../../../src/server/src/utils/errors');
    mockService.promoteItem.mockRejectedValue(new ValidationError('Cannot promote to Untyped'));

    const res = await request(app)
      .post('/api/items/x/promote')
      .send({ new_type: 'Untyped' });

    expect(res.status).toBe(422);
  });
});

// ── POST /api/items/:id/archive ───────────────────────────────────────────────

describe('POST /api/items/:id/archive', () => {
  test('200 with archived item', async () => {
    const item = makeItem({ status: ItemStatus.Archived });
    mockService.archiveItem.mockResolvedValue(item);

    const res = await request(app).post(`/api/items/${item.id}/archive`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('Archived');
  });

  test('409 when already archived', async () => {
    const { ConflictError } = await import('../../../../../src/server/src/utils/errors');
    mockService.archiveItem.mockRejectedValue(new ConflictError('Item is already archived'));

    const res = await request(app).post('/api/items/x/archive');
    expect(res.status).toBe(409);
  });
});

// ── POST /api/items/:id/restore ───────────────────────────────────────────────

describe('POST /api/items/:id/restore', () => {
  test('200 with restored item', async () => {
    const item = makeItem({ status: ItemStatus.Active });
    mockService.restoreItem.mockResolvedValue(item);

    const res = await request(app).post(`/api/items/${item.id}/restore`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('Active');
  });

  test('409 when item is not archived', async () => {
    const { ConflictError } = await import('../../../../../src/server/src/utils/errors');
    mockService.restoreItem.mockRejectedValue(new ConflictError('Item is not archived'));

    const res = await request(app).post('/api/items/x/restore');
    expect(res.status).toBe(409);
  });
});

// ── Error handler — unhandled errors ──────────────────────────────────────────

describe('error handler', () => {
  test('500 for unexpected errors', async () => {
    mockService.getItemById.mockRejectedValue(new Error('unexpected DB explosion'));

    const res = await request(app).get('/api/items/any-id');
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
  });
});
