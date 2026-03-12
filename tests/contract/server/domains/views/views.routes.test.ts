import request from 'supertest';
import { ViewType } from '../../../../../src/server/src/types';
import { TEST_USER_ID } from '../../../../helpers/itemFactory';

// ── Mock service and DB before importing the app ──────────────────────────────
jest.mock('../../../../../src/server/src/domains/views/views.service');
jest.mock('../../../../../src/server/src/db/client', () => ({
  getPool:         jest.fn(),
  query:           jest.fn(),
  queryOne:        jest.fn(),
  withTransaction: jest.fn(),
  closePool:       jest.fn(),
}));

import * as service from '../../../../../src/server/src/domains/views/views.service';
import { createApp } from '../../../../../src/server/src/app';

const mockService = service as jest.Mocked<typeof service>;
const app = createApp();

let _seq = 200;
function uid() { return `00000000-0000-0000-0000-${String(_seq++).padStart(12, '0')}`; }
function now() { return new Date().toISOString(); }

function makeDashboard() {
  return { id: uid(), user_id: TEST_USER_ID, columns: 3, created_at: now(), updated_at: now() };
}

function makeBlock(dashboardId = uid()) {
  return {
    id: uid(), dashboard_id: dashboardId, user_id: TEST_USER_ID,
    view_type: ViewType.RecentItems, title: 'Recent', row: 0, column: 0,
    created_at: now(), updated_at: now(),
  };
}

beforeEach(() => jest.clearAllMocks());

// ── GET /api/dashboard ────────────────────────────────────────────────────────

describe('GET /api/dashboard', () => {
  test('200 with dashboard and blocks', async () => {
    const dashboard = makeDashboard();
    const blocks    = [makeBlock(dashboard.id)];
    mockService.getDashboard.mockResolvedValue({ dashboard, blocks });

    const res = await request(app).get('/api/dashboard');

    expect(res.status).toBe(200);
    expect(res.body.dashboard.id).toBe(dashboard.id);
    expect(res.body.blocks).toHaveLength(1);
    expect(mockService.getDashboard).toHaveBeenCalledWith(TEST_USER_ID);
  });
});

// ── POST /api/dashboard/:dashboardId/blocks ───────────────────────────────────

describe('POST /api/dashboard/:dashboardId/blocks', () => {
  test('201 with created block', async () => {
    const dashboard = makeDashboard();
    const block     = makeBlock(dashboard.id);
    block.view_type = ViewType.Notes;
    mockService.addBlock.mockResolvedValue(block);

    const res = await request(app)
      .post(`/api/dashboard/${dashboard.id}/blocks`)
      .send({ view_type: 'Notes', title: 'Notes', row: 2, column: 0 });

    expect(res.status).toBe(201);
    expect(res.body.view_type).toBe('Notes');
    expect(mockService.addBlock).toHaveBeenCalledWith(
      TEST_USER_ID, dashboard.id,
      expect.objectContaining({ view_type: 'Notes', row: 2, column: 0 })
    );
  });

  test('404 when dashboard not found', async () => {
    const { NotFoundError } = await import('../../../../../src/server/src/utils/errors');
    mockService.addBlock.mockRejectedValue(new NotFoundError('Dashboard', 'missing'));

    const res = await request(app)
      .post('/api/dashboard/missing/blocks')
      .send({ view_type: 'Notes', row: 0, column: 0 });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  test('422 when block limit exceeded', async () => {
    const { LimitExceeded } = await import('../../../../../src/server/src/utils/errors');
    mockService.addBlock.mockRejectedValue(
      new LimitExceeded('Too many blocks', { current_count: 12, maximum: 12 })
    );

    const res = await request(app)
      .post('/api/dashboard/some-id/blocks')
      .send({ view_type: 'Notes', row: 0, column: 0 });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('LIMIT_EXCEEDED');
  });

  test('422 for invalid view type', async () => {
    const { ValidationError } = await import('../../../../../src/server/src/utils/errors');
    mockService.addBlock.mockRejectedValue(new ValidationError('Unsupported view type'));

    const res = await request(app)
      .post('/api/dashboard/some-id/blocks')
      .send({ view_type: 'BadType', row: 0, column: 0 });

    expect(res.status).toBe(422);
  });
});

// ── PATCH /api/dashboard/blocks/:blockId ─────────────────────────────────────

describe('PATCH /api/dashboard/blocks/:blockId', () => {
  test('200 with updated block', async () => {
    const block = makeBlock();
    block.title = 'Updated Title';
    mockService.updateBlock.mockResolvedValue(block);

    const res = await request(app)
      .patch(`/api/dashboard/blocks/${block.id}`)
      .send({ title: 'Updated Title' });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Updated Title');
    expect(mockService.updateBlock).toHaveBeenCalledWith(
      TEST_USER_ID, block.id,
      expect.objectContaining({ title: 'Updated Title' })
    );
  });

  test('404 when block not found', async () => {
    const { NotFoundError } = await import('../../../../../src/server/src/utils/errors');
    mockService.updateBlock.mockRejectedValue(new NotFoundError('Block', 'missing'));

    const res = await request(app)
      .patch('/api/dashboard/blocks/missing')
      .send({ title: 'x' });

    expect(res.status).toBe(404);
  });

  test('403 when not owner', async () => {
    const { AuthorizationError } = await import('../../../../../src/server/src/utils/errors');
    mockService.updateBlock.mockRejectedValue(new AuthorizationError('Not owner'));

    const res = await request(app)
      .patch('/api/dashboard/blocks/some-id')
      .send({ title: 'x' });

    expect(res.status).toBe(403);
  });
});

// ── DELETE /api/dashboard/blocks/:blockId ─────────────────────────────────────

describe('DELETE /api/dashboard/blocks/:blockId', () => {
  test('204 on successful remove', async () => {
    mockService.removeBlock.mockResolvedValue(undefined);

    const res = await request(app).delete('/api/dashboard/blocks/some-id');

    expect(res.status).toBe(204);
    expect(mockService.removeBlock).toHaveBeenCalledWith(TEST_USER_ID, 'some-id');
  });

  test('404 when block not found', async () => {
    const { NotFoundError } = await import('../../../../../src/server/src/utils/errors');
    mockService.removeBlock.mockRejectedValue(new NotFoundError('Block', 'missing'));

    const res = await request(app).delete('/api/dashboard/blocks/missing');

    expect(res.status).toBe(404);
  });

  test('422 when removing last block', async () => {
    const { PolicyViolation } = await import('../../../../../src/server/src/utils/errors');
    mockService.removeBlock.mockRejectedValue(new PolicyViolation('Cannot remove last block'));

    const res = await request(app).delete('/api/dashboard/blocks/only-block');

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('POLICY_VIOLATION');
  });
});

// ── PUT /api/dashboard/blocks/reorder ────────────────────────────────────────

describe('PUT /api/dashboard/blocks/reorder', () => {
  test('204 on successful reorder', async () => {
    mockService.reorderBlocks.mockResolvedValue(undefined);

    const positions = [
      { block_id: 'block-1', row: 0, column: 0 },
      { block_id: 'block-2', row: 0, column: 1 },
    ];

    const res = await request(app)
      .put('/api/dashboard/blocks/reorder')
      .send({ positions });

    expect(res.status).toBe(204);
    expect(mockService.reorderBlocks).toHaveBeenCalledWith(TEST_USER_ID, positions);
  });

  test('404 when a block is not found', async () => {
    const { NotFoundError } = await import('../../../../../src/server/src/utils/errors');
    mockService.reorderBlocks.mockRejectedValue(new NotFoundError('Block', 'missing'));

    const res = await request(app)
      .put('/api/dashboard/blocks/reorder')
      .send({ positions: [{ block_id: 'missing', row: 0, column: 0 }] });

    expect(res.status).toBe(404);
  });
});
