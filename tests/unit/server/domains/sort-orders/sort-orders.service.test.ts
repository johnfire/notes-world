import { TEST_USER_ID } from '../../../../helpers/itemFactory';

// ── Mock repository before importing service ──────────────────────────────────
jest.mock('../../../../../src/server/src/domains/sort-orders/sort-orders.repository');

import * as repo    from '../../../../../src/server/src/domains/sort-orders/sort-orders.repository';
import * as service from '../../../../../src/server/src/domains/sort-orders/sort-orders.service';

const mockRepo = repo as jest.Mocked<typeof repo>;

let _seq = 1;
function uid() { return `00000000-0000-0000-0000-${String(_seq++).padStart(12, '0')}`; }

function makeRow(overrides: Record<string, unknown> = {}) {
  return { item_id: uid(), sort_order: 0, ...overrides };
}

beforeEach(() => jest.clearAllMocks());

// ── getSortOrders ─────────────────────────────────────────────────────────────

describe('getSortOrders', () => {
  test('returns rows from repository', async () => {
    const rows = [makeRow({ sort_order: 0 }), makeRow({ sort_order: 1 })];
    mockRepo.findSortOrders.mockResolvedValue(rows);

    const result = await service.getSortOrders(TEST_USER_ID, 'tag:abc');

    expect(result).toBe(rows);
    expect(mockRepo.findSortOrders).toHaveBeenCalledWith(TEST_USER_ID, 'tag:abc');
  });

  test('throws ValidationError when contextKey is empty', async () => {
    await expect(service.getSortOrders(TEST_USER_ID, ''))
      .rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(mockRepo.findSortOrders).not.toHaveBeenCalled();
  });
});

// ── saveSortOrders ────────────────────────────────────────────────────────────

describe('saveSortOrders', () => {
  test('calls repository with correct args', async () => {
    mockRepo.upsertSortOrders.mockResolvedValue(undefined);
    const ids = [uid(), uid()];

    await service.saveSortOrders(TEST_USER_ID, 'maturity:active', ids);

    expect(mockRepo.upsertSortOrders).toHaveBeenCalledWith(TEST_USER_ID, 'maturity:active', ids);
  });

  test('throws ValidationError when contextKey is empty', async () => {
    await expect(service.saveSortOrders(TEST_USER_ID, '', [uid()]))
      .rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(mockRepo.upsertSortOrders).not.toHaveBeenCalled();
  });

  test('throws ValidationError when item_ids is not an array', async () => {
    await expect(service.saveSortOrders(TEST_USER_ID, 'tag:abc', 'not-an-array' as unknown as string[]))
      .rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(mockRepo.upsertSortOrders).not.toHaveBeenCalled();
  });

  test('accepts empty array', async () => {
    mockRepo.upsertSortOrders.mockResolvedValue(undefined);

    await service.saveSortOrders(TEST_USER_ID, 'tag:abc', []);

    expect(mockRepo.upsertSortOrders).toHaveBeenCalledWith(TEST_USER_ID, 'tag:abc', []);
  });
});
