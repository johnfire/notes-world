import request from 'supertest';
import { TEST_USER_ID } from '../../../../helpers/itemFactory';

jest.mock('../../../../../src/server/src/domains/dividers/dividers.service');
jest.mock('../../../../../src/server/src/db/client', () => ({
  getPool:         jest.fn(),
  query:           jest.fn(),
  queryOne:        jest.fn(),
  withTransaction: jest.fn(),
  closePool:       jest.fn(),
}));

import * as service from '../../../../../src/server/src/domains/dividers/dividers.service';
import { createApp } from '../../../../../src/server/src/app';

const mockService = service as jest.Mocked<typeof service>;
const app = createApp();

let _seq = 400;
function uid() { return `00000000-0000-0000-0000-${String(_seq++).padStart(12, '0')}`; }
function now() { return new Date().toISOString(); }

function makeDivider(label: string | null = null) {
  return { id: uid(), user_id: TEST_USER_ID, label, created_at: now(), updated_at: now() };
}

beforeEach(() => jest.clearAllMocks());

// ── GET /api/dividers ─────────────────────────────────────────────────────────

describe('GET /api/dividers', () => {
  test('200 with list of dividers', async () => {
    const dividers = [makeDivider('Work'), makeDivider()];
    mockService.listDividers.mockResolvedValue(dividers);

    const res = await request(app).get('/api/dividers');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(mockService.listDividers).toHaveBeenCalledWith(TEST_USER_ID);
  });

  test('200 with empty list', async () => {
    mockService.listDividers.mockResolvedValue([]);

    const res = await request(app).get('/api/dividers');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

// ── POST /api/dividers ────────────────────────────────────────────────────────

describe('POST /api/dividers', () => {
  test('201 with created divider with label', async () => {
    const divider = makeDivider('Work');
    mockService.createDivider.mockResolvedValue(divider);

    const res = await request(app).post('/api/dividers').send({ label: 'Work' });

    expect(res.status).toBe(201);
    expect(res.body.label).toBe('Work');
    expect(mockService.createDivider).toHaveBeenCalledWith(TEST_USER_ID, 'Work');
  });

  test('201 with created divider without label', async () => {
    const divider = makeDivider();
    mockService.createDivider.mockResolvedValue(divider);

    const res = await request(app).post('/api/dividers').send({});

    expect(res.status).toBe(201);
    expect(res.body.label).toBeNull();
    expect(mockService.createDivider).toHaveBeenCalledWith(TEST_USER_ID, undefined);
  });
});

// ── PATCH /api/dividers/:id ───────────────────────────────────────────────────

describe('PATCH /api/dividers/:id', () => {
  test('200 with updated divider', async () => {
    const divider = makeDivider('Updated');
    mockService.updateDivider.mockResolvedValue(divider);

    const res = await request(app)
      .patch(`/api/dividers/${divider.id}`)
      .send({ label: 'Updated' });

    expect(res.status).toBe(200);
    expect(res.body.label).toBe('Updated');
    expect(mockService.updateDivider).toHaveBeenCalledWith(TEST_USER_ID, divider.id, 'Updated');
  });

  test('200 clears label when null sent', async () => {
    const divider = makeDivider(null);
    mockService.updateDivider.mockResolvedValue(divider);

    const res = await request(app)
      .patch(`/api/dividers/${divider.id}`)
      .send({ label: null });

    expect(res.status).toBe(200);
    expect(mockService.updateDivider).toHaveBeenCalledWith(TEST_USER_ID, divider.id, null);
  });

  test('404 when divider not found', async () => {
    const { NotFoundError } = await import('../../../../../src/server/src/utils/errors');
    mockService.updateDivider.mockRejectedValue(new NotFoundError('Divider', 'missing'));

    const res = await request(app).patch('/api/dividers/missing').send({ label: 'x' });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  test('403 when not owner', async () => {
    const { AuthorizationError } = await import('../../../../../src/server/src/utils/errors');
    mockService.updateDivider.mockRejectedValue(new AuthorizationError('Not your divider'));

    const res = await request(app).patch('/api/dividers/some-id').send({ label: 'x' });

    expect(res.status).toBe(403);
  });
});

// ── DELETE /api/dividers/:id ──────────────────────────────────────────────────

describe('DELETE /api/dividers/:id', () => {
  test('204 on successful delete', async () => {
    mockService.deleteDivider.mockResolvedValue(undefined);

    const res = await request(app).delete('/api/dividers/some-id');

    expect(res.status).toBe(204);
    expect(mockService.deleteDivider).toHaveBeenCalledWith(TEST_USER_ID, 'some-id');
  });

  test('404 when divider not found', async () => {
    const { NotFoundError } = await import('../../../../../src/server/src/utils/errors');
    mockService.deleteDivider.mockRejectedValue(new NotFoundError('Divider', 'missing'));

    const res = await request(app).delete('/api/dividers/missing');

    expect(res.status).toBe(404);
  });
});
