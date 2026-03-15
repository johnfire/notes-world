import request from 'supertest';
import { TEST_USER_ID } from '../../../../helpers/itemFactory';

// ── Mock service and DB before importing the app ──────────────────────────────
jest.mock('../../../../../src/server/src/domains/sort-orders/sort-orders.service');
jest.mock('../../../../../src/server/src/db/client', () => ({
  getPool:         jest.fn(),
  query:           jest.fn(),
  queryOne:        jest.fn(),
  withTransaction: jest.fn(),
  closePool:       jest.fn(),
}));

import * as service from '../../../../../src/server/src/domains/sort-orders/sort-orders.service';
import { createApp } from '../../../../../src/server/src/app';

const mockService = service as jest.Mocked<typeof service>;
const app = createApp();

let _seq = 300;
function uid() { return `00000000-0000-0000-0000-${String(_seq++).padStart(12, '0')}`; }

beforeEach(() => jest.clearAllMocks());

// ── GET /api/sort-orders ──────────────────────────────────────────────────────

describe('GET /api/sort-orders', () => {
  test('200 with sort order rows', async () => {
    const rows = [
      { item_id: uid(), sort_order: 0 },
      { item_id: uid(), sort_order: 1 },
    ];
    mockService.getSortOrders.mockResolvedValue(rows);

    const res = await request(app).get('/api/sort-orders?context=tag%3Aabc');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(mockService.getSortOrders).toHaveBeenCalledWith(TEST_USER_ID, 'tag:abc');
  });

  test('200 with empty array when no orders saved', async () => {
    mockService.getSortOrders.mockResolvedValue([]);

    const res = await request(app).get('/api/sort-orders?context=maturity%3Aactive');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('422 when context is missing', async () => {
    const { ValidationError } = await import('../../../../../src/server/src/utils/errors');
    mockService.getSortOrders.mockRejectedValue(new ValidationError('contextKey is required'));

    const res = await request(app).get('/api/sort-orders');

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

// ── PUT /api/sort-orders ──────────────────────────────────────────────────────

describe('PUT /api/sort-orders', () => {
  test('204 on successful save', async () => {
    mockService.saveSortOrders.mockResolvedValue(undefined);
    const ids = [uid(), uid(), uid()];

    const res = await request(app)
      .put('/api/sort-orders')
      .send({ context_key: 'tag:abc', item_ids: ids });

    expect(res.status).toBe(204);
    expect(mockService.saveSortOrders).toHaveBeenCalledWith(TEST_USER_ID, 'tag:abc', ids);
  });

  test('204 with empty item_ids', async () => {
    mockService.saveSortOrders.mockResolvedValue(undefined);

    const res = await request(app)
      .put('/api/sort-orders')
      .send({ context_key: 'tag:abc', item_ids: [] });

    expect(res.status).toBe(204);
  });

  test('422 when context_key is missing', async () => {
    const { ValidationError } = await import('../../../../../src/server/src/utils/errors');
    mockService.saveSortOrders.mockRejectedValue(new ValidationError('contextKey is required'));

    const res = await request(app)
      .put('/api/sort-orders')
      .send({ item_ids: [uid()] });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('422 when item_ids is not an array', async () => {
    const { ValidationError } = await import('../../../../../src/server/src/utils/errors');
    mockService.saveSortOrders.mockRejectedValue(new ValidationError('item_ids must be an array'));

    const res = await request(app)
      .put('/api/sort-orders')
      .send({ context_key: 'tag:abc', item_ids: 'not-an-array' });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
