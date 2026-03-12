import request from 'supertest';
import { DependencyStatus } from '../../../../../src/server/src/types';
import { makeItem, TEST_USER_ID } from '../../../../helpers/itemFactory';

// ── Mock service and DB before importing the app ──────────────────────────────
jest.mock('../../../../../src/server/src/domains/relationships/dependencies.service');
jest.mock('../../../../../src/server/src/db/client', () => ({
  getPool:         jest.fn(),
  query:           jest.fn(),
  queryOne:        jest.fn(),
  withTransaction: jest.fn(),
  closePool:       jest.fn(),
}));

import * as service from '../../../../../src/server/src/domains/relationships/dependencies.service';
import { createApp } from '../../../../../src/server/src/app';

const mockService = service as jest.Mocked<typeof service>;
const app = createApp();

const ITEM_A_ID = '00000000-0000-0000-0001-000000000001';
const ITEM_B_ID = '00000000-0000-0000-0001-000000000002';

function makeDep(overrides = {}) {
  return {
    id:            'dep-id-1',
    dependent_id:  ITEM_A_ID,
    dependency_id: ITEM_B_ID,
    user_id:       TEST_USER_ID,
    status:        DependencyStatus.Active,
    created_at:    new Date().toISOString(),
    resolved_at:   null,
    removed_at:    null,
    ...overrides,
  };
}

beforeEach(() => jest.clearAllMocks());

// ── POST /api/items/:dependentId/dependencies ─────────────────────────────────

describe('POST /api/items/:dependentId/dependencies', () => {
  test('201 with created dependency', async () => {
    const dep = makeDep();
    mockService.addDependency.mockResolvedValue(dep);

    const res = await request(app)
      .post(`/api/items/${ITEM_A_ID}/dependencies`)
      .send({ dependency_id: ITEM_B_ID });

    expect(res.status).toBe(201);
    expect(res.body.id).toBe('dep-id-1');
    expect(mockService.addDependency).toHaveBeenCalledWith(TEST_USER_ID, ITEM_A_ID, ITEM_B_ID);
  });

  test('422 when self-dependency', async () => {
    const { ValidationError } = await import('../../../../../src/server/src/utils/errors');
    mockService.addDependency.mockRejectedValue(new ValidationError('An item cannot depend on itself'));

    const res = await request(app)
      .post(`/api/items/${ITEM_A_ID}/dependencies`)
      .send({ dependency_id: ITEM_A_ID });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('404 when item not found', async () => {
    const { NotFoundError } = await import('../../../../../src/server/src/utils/errors');
    mockService.addDependency.mockRejectedValue(new NotFoundError('Item', 'missing'));

    const res = await request(app)
      .post(`/api/items/missing/dependencies`)
      .send({ dependency_id: ITEM_B_ID });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  test('409 when dependency already exists', async () => {
    const { ConflictError } = await import('../../../../../src/server/src/utils/errors');
    mockService.addDependency.mockRejectedValue(new ConflictError('Dependency already exists'));

    const res = await request(app)
      .post(`/api/items/${ITEM_A_ID}/dependencies`)
      .send({ dependency_id: ITEM_B_ID });

    expect(res.status).toBe(409);
  });

  test('422 when circular dependency', async () => {
    const { CircularDependencyError } = await import('../../../../../src/server/src/utils/errors');
    mockService.addDependency.mockRejectedValue(new CircularDependencyError([ITEM_A_ID, ITEM_B_ID, ITEM_A_ID]));

    const res = await request(app)
      .post(`/api/items/${ITEM_A_ID}/dependencies`)
      .send({ dependency_id: ITEM_B_ID });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('CIRCULAR_DEPENDENCY');
  });
});

// ── DELETE /api/dependencies/:id ──────────────────────────────────────────────

describe('DELETE /api/dependencies/:id', () => {
  test('204 on success', async () => {
    mockService.removeDependency.mockResolvedValue(undefined);

    const res = await request(app).delete('/api/dependencies/dep-id-1');

    expect(res.status).toBe(204);
    expect(mockService.removeDependency).toHaveBeenCalledWith(TEST_USER_ID, 'dep-id-1');
  });

  test('404 when not found', async () => {
    const { NotFoundError } = await import('../../../../../src/server/src/utils/errors');
    mockService.removeDependency.mockRejectedValue(new NotFoundError('Dependency', 'missing'));

    const res = await request(app).delete('/api/dependencies/missing');

    expect(res.status).toBe(404);
  });

  test('409 when not active', async () => {
    const { ConflictError } = await import('../../../../../src/server/src/utils/errors');
    mockService.removeDependency.mockRejectedValue(new ConflictError('Dependency is not active'));

    const res = await request(app).delete('/api/dependencies/dep-id-1');

    expect(res.status).toBe(409);
  });
});

// ── GET /api/items/:itemId/dependencies ───────────────────────────────────────

describe('GET /api/items/:itemId/dependencies', () => {
  test('200 with list of deps', async () => {
    const deps = [makeDep(), makeDep({ id: 'dep-id-2' })];
    mockService.getDependenciesForItem.mockResolvedValue(deps);

    const res = await request(app).get(`/api/items/${ITEM_A_ID}/dependencies`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(mockService.getDependenciesForItem).toHaveBeenCalledWith(TEST_USER_ID, ITEM_A_ID);
  });
});

// ── GET /api/items/:itemId/dependents ─────────────────────────────────────────

describe('GET /api/items/:itemId/dependents', () => {
  test('200 with list of dependents', async () => {
    const deps = [makeDep()];
    mockService.getDependentsOfItem.mockResolvedValue(deps);

    const res = await request(app).get(`/api/items/${ITEM_B_ID}/dependents`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(mockService.getDependentsOfItem).toHaveBeenCalledWith(TEST_USER_ID, ITEM_B_ID);
  });
});

// ── GET /api/items/:itemId/dependency-chain ───────────────────────────────────

describe('GET /api/items/:itemId/dependency-chain', () => {
  test('200 with chain of item IDs', async () => {
    const chain = [ITEM_B_ID, '00000000-0000-0000-0001-000000000003'];
    mockService.getDependencyChain.mockResolvedValue(chain);

    const res = await request(app).get(`/api/items/${ITEM_A_ID}/dependency-chain`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(mockService.getDependencyChain).toHaveBeenCalledWith(TEST_USER_ID, ITEM_A_ID);
  });
});

// ── POST /api/items/:itemId/cross-references ──────────────────────────────────

describe('POST /api/items/:itemId/cross-references', () => {
  test('204 on success', async () => {
    mockService.addCrossReference.mockResolvedValue(undefined);

    const res = await request(app)
      .post(`/api/items/${ITEM_A_ID}/cross-references`)
      .send({ item_b_id: ITEM_B_ID });

    expect(res.status).toBe(204);
    expect(mockService.addCrossReference).toHaveBeenCalledWith(TEST_USER_ID, ITEM_A_ID, ITEM_B_ID);
  });

  test('422 when self-reference', async () => {
    const { ValidationError } = await import('../../../../../src/server/src/utils/errors');
    mockService.addCrossReference.mockRejectedValue(new ValidationError('Cannot cross-reference an item with itself'));

    const res = await request(app)
      .post(`/api/items/${ITEM_A_ID}/cross-references`)
      .send({ item_b_id: ITEM_A_ID });

    expect(res.status).toBe(422);
  });

  test('404 when item not found', async () => {
    const { NotFoundError } = await import('../../../../../src/server/src/utils/errors');
    mockService.addCrossReference.mockRejectedValue(new NotFoundError('Item', 'missing'));

    const res = await request(app)
      .post(`/api/items/missing/cross-references`)
      .send({ item_b_id: ITEM_B_ID });

    expect(res.status).toBe(404);
  });
});

// ── DELETE /api/cross-references/:id ─────────────────────────────────────────

describe('DELETE /api/cross-references/:id', () => {
  test('204 on success', async () => {
    mockService.removeCrossReference.mockResolvedValue(undefined);

    const res = await request(app).delete('/api/cross-references/ref-1');

    expect(res.status).toBe(204);
    expect(mockService.removeCrossReference).toHaveBeenCalledWith(TEST_USER_ID, 'ref-1');
  });

  test('404 when not found', async () => {
    const { NotFoundError } = await import('../../../../../src/server/src/utils/errors');
    mockService.removeCrossReference.mockRejectedValue(new NotFoundError('CrossReference', 'missing'));

    const res = await request(app).delete('/api/cross-references/missing');

    expect(res.status).toBe(404);
  });
});

// ── GET /api/items/:itemId/cross-references ───────────────────────────────────

describe('GET /api/items/:itemId/cross-references', () => {
  test('200 with list of item IDs', async () => {
    const ids = [ITEM_B_ID];
    mockService.getCrossReferences.mockResolvedValue(ids);

    const res = await request(app).get(`/api/items/${ITEM_A_ID}/cross-references`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(mockService.getCrossReferences).toHaveBeenCalledWith(TEST_USER_ID, ITEM_A_ID);
  });
});
