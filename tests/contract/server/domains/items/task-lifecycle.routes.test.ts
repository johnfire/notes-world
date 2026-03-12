import request from 'supertest';
import { ItemType, TaskStatus, Priority } from '../../../../../src/server/src/types';
import { makeItem } from '../../../../helpers/itemFactory';

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

// ── POST /api/items/:id/complete ──────────────────────────────────────────────

describe('POST /api/items/:id/complete', () => {
  test('200 with updated item', async () => {
    const item = makeItem({
      item_type: ItemType.Task,
      type_data: { task_status: TaskStatus.Done, priority: Priority.Normal, completed_at: new Date().toISOString() },
    });
    mockService.completeTask.mockResolvedValue(item);

    const res = await request(app).post(`/api/items/${item.id}/complete`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(item.id);
  });

  test('422 when StateError (blocked)', async () => {
    const { StateError } = await import('../../../../../src/server/src/utils/errors');
    mockService.completeTask.mockRejectedValue(
      new StateError('Cannot complete a blocked task — resolve dependencies first')
    );

    const res = await request(app).post('/api/items/some-id/complete');

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('STATE_ERROR');
  });

  test('409 when ConflictError (already done)', async () => {
    const { ConflictError } = await import('../../../../../src/server/src/utils/errors');
    mockService.completeTask.mockRejectedValue(new ConflictError('Task is already Done'));

    const res = await request(app).post('/api/items/some-id/complete');

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT_ERROR');
  });
});

// ── POST /api/items/:id/start ─────────────────────────────────────────────────

describe('POST /api/items/:id/start', () => {
  test('200 with updated item', async () => {
    const item = makeItem({
      item_type: ItemType.Task,
      type_data: { task_status: TaskStatus.InProgress, priority: Priority.Normal },
    });
    mockService.startTask.mockResolvedValue(item);

    const res = await request(app).post(`/api/items/${item.id}/start`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(item.id);
  });

  test('422 when StateError', async () => {
    const { StateError } = await import('../../../../../src/server/src/utils/errors');
    mockService.startTask.mockRejectedValue(new StateError('Cannot start a blocked task — resolve dependencies first'));

    const res = await request(app).post('/api/items/some-id/start');

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('STATE_ERROR');
  });
});

// ── POST /api/items/:id/block ─────────────────────────────────────────────────

describe('POST /api/items/:id/block', () => {
  test('200 with updated item', async () => {
    const item = makeItem({
      item_type: ItemType.Task,
      type_data: { task_status: TaskStatus.Blocked, priority: Priority.Normal },
    });
    mockService.blockTask.mockResolvedValue(item);

    const res = await request(app).post(`/api/items/${item.id}/block`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(item.id);
  });

  test('422 when ValidationError (not a task)', async () => {
    const { ValidationError } = await import('../../../../../src/server/src/utils/errors');
    mockService.blockTask.mockRejectedValue(new ValidationError('Item is not a Task'));

    const res = await request(app).post('/api/items/some-id/block');

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
