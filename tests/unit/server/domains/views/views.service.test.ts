import { ViewType } from '../../../../../src/server/src/types';
import { TEST_USER_ID, OTHER_USER_ID } from '../../../../helpers/itemFactory';

// ── Mock repository before importing service ──────────────────────────────────
jest.mock('../../../../../src/server/src/domains/views/views.repository');

import * as repo    from '../../../../../src/server/src/domains/views/views.repository';
import * as service from '../../../../../src/server/src/domains/views/views.service';

const mockRepo = repo as jest.Mocked<typeof repo>;

let _seq = 100;
function uid() { return `00000000-0000-0000-0000-${String(_seq++).padStart(12, '0')}`; }
function now() { return new Date().toISOString(); }

function makeDashboard(overrides: Record<string, unknown> = {}) {
  return {
    id:         uid(),
    user_id:    TEST_USER_ID,
    columns:    3,
    created_at: now(),
    updated_at: now(),
    ...overrides,
  };
}

function makeBlock(overrides: Record<string, unknown> = {}) {
  const dashboard_id = uid();
  return {
    id:           uid(),
    dashboard_id,
    user_id:      TEST_USER_ID,
    view_type:    ViewType.RecentItems,
    title:        'Recent Items',
    row:          0,
    column:       0,
    created_at:   now(),
    updated_at:   now(),
    ...overrides,
  };
}

beforeEach(() => jest.clearAllMocks());

// ── getDashboard ──────────────────────────────────────────────────────────────

describe('getDashboard', () => {
  test('returns existing dashboard with blocks', async () => {
    const dashboard = makeDashboard();
    const blocks    = [makeBlock({ dashboard_id: dashboard.id })];
    mockRepo.findDashboardByUser.mockResolvedValue(dashboard);
    mockRepo.findBlocksByDashboard.mockResolvedValue(blocks);

    const result = await service.getDashboard(TEST_USER_ID);

    expect(result.dashboard).toBe(dashboard);
    expect(result.blocks).toBe(blocks);
    expect(mockRepo.findBlocksByDashboard).toHaveBeenCalledWith(dashboard.id, TEST_USER_ID);
  });

  test('auto-initializes dashboard when none exists', async () => {
    const dashboard = makeDashboard();
    const blocks    = [makeBlock()];

    mockRepo.findDashboardByUser
      .mockResolvedValueOnce(null)    // first call: not found → trigger init
      .mockResolvedValueOnce(null);   // initializeDashboard calls it again

    mockRepo.insertDashboard.mockResolvedValue(dashboard);
    mockRepo.insertBlock.mockResolvedValue(makeBlock());
    mockRepo.findBlocksByDashboard.mockResolvedValue(blocks);

    const result = await service.getDashboard(TEST_USER_ID);

    expect(mockRepo.insertDashboard).toHaveBeenCalledWith(TEST_USER_ID, 3);
    expect(mockRepo.insertBlock).toHaveBeenCalledTimes(6); // 6 default blocks
    expect(result.dashboard).toBe(dashboard);
  });
});

// ── initializeDashboard ───────────────────────────────────────────────────────

describe('initializeDashboard', () => {
  test('creates dashboard with 6 default blocks', async () => {
    const dashboard = makeDashboard();
    mockRepo.findDashboardByUser.mockResolvedValue(null);
    mockRepo.insertDashboard.mockResolvedValue(dashboard);
    mockRepo.insertBlock.mockResolvedValue(makeBlock());

    const result = await service.initializeDashboard(TEST_USER_ID);

    expect(mockRepo.insertDashboard).toHaveBeenCalledWith(TEST_USER_ID, 3);
    expect(mockRepo.insertBlock).toHaveBeenCalledTimes(6);
    expect(result).toBe(dashboard);
  });

  test('includes QuickCapture block in defaults', async () => {
    const dashboard = makeDashboard();
    mockRepo.findDashboardByUser.mockResolvedValue(null);
    mockRepo.insertDashboard.mockResolvedValue(dashboard);
    mockRepo.insertBlock.mockResolvedValue(makeBlock());

    await service.initializeDashboard(TEST_USER_ID);

    const viewTypes = mockRepo.insertBlock.mock.calls.map(c => c[2]);
    expect(viewTypes).toContain(ViewType.QuickCapture);
    expect(viewTypes).toContain(ViewType.ActionableTasks);
    expect(viewTypes).toContain(ViewType.RecentItems);
    expect(viewTypes).toContain(ViewType.TagCloud);
    expect(viewTypes).toContain(ViewType.OverdueTasks);
    expect(viewTypes).toContain(ViewType.BlockedTasks);
  });

  test('throws ConflictError when dashboard already exists', async () => {
    mockRepo.findDashboardByUser.mockResolvedValue(makeDashboard());

    await expect(service.initializeDashboard(TEST_USER_ID))
      .rejects.toMatchObject({ code: 'CONFLICT_ERROR' });
    expect(mockRepo.insertDashboard).not.toHaveBeenCalled();
  });
});

// ── addBlock ──────────────────────────────────────────────────────────────────

describe('addBlock', () => {
  test('adds a block to dashboard', async () => {
    const dashboard = makeDashboard();
    const block     = makeBlock({ dashboard_id: dashboard.id, view_type: ViewType.Notes });
    mockRepo.findDashboardByUser.mockResolvedValue(dashboard);
    mockRepo.countBlocksByDashboard.mockResolvedValue(5);
    mockRepo.insertBlock.mockResolvedValue(block);

    const result = await service.addBlock(TEST_USER_ID, dashboard.id, {
      view_type: ViewType.Notes,
      title:     'My Notes',
      row:       3,
      column:    0,
    });

    expect(mockRepo.insertBlock).toHaveBeenCalledWith(
      dashboard.id, TEST_USER_ID, ViewType.Notes, 'My Notes', 3, 0, undefined
    );
    expect(result).toBe(block);
  });

  test('throws NotFoundError when dashboard not found', async () => {
    mockRepo.findDashboardByUser.mockResolvedValue(null);

    await expect(service.addBlock(TEST_USER_ID, 'x', { view_type: ViewType.Notes, row: 0, column: 0 }))
      .rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  test('throws NotFoundError when dashboard id does not match', async () => {
    const dashboard = makeDashboard();
    mockRepo.findDashboardByUser.mockResolvedValue(dashboard);

    await expect(service.addBlock(TEST_USER_ID, 'wrong-id', { view_type: ViewType.Notes, row: 0, column: 0 }))
      .rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  test('throws LimitExceeded when at max blocks', async () => {
    const dashboard = makeDashboard();
    mockRepo.findDashboardByUser.mockResolvedValue(dashboard);
    mockRepo.countBlocksByDashboard.mockResolvedValue(12); // DASHBOARD_BLOCKS_MAX

    await expect(service.addBlock(TEST_USER_ID, dashboard.id, { view_type: ViewType.Notes, row: 0, column: 0 }))
      .rejects.toMatchObject({ code: 'LIMIT_EXCEEDED' });
  });

  test('throws ValidationError for unsupported view type', async () => {
    const dashboard = makeDashboard();
    mockRepo.findDashboardByUser.mockResolvedValue(dashboard);
    mockRepo.countBlocksByDashboard.mockResolvedValue(5);

    await expect(service.addBlock(TEST_USER_ID, dashboard.id, {
      view_type: 'InvalidType' as ViewType,
      row: 0, column: 0,
    })).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });
});

// ── removeBlock ───────────────────────────────────────────────────────────────

describe('removeBlock', () => {
  test('removes block successfully', async () => {
    const block = makeBlock();
    mockRepo.findBlockById.mockResolvedValue(block);
    mockRepo.countBlocksByDashboard.mockResolvedValue(5);
    mockRepo.deleteBlock.mockResolvedValue(undefined);

    await service.removeBlock(TEST_USER_ID, block.id);

    expect(mockRepo.deleteBlock).toHaveBeenCalledWith(block.id, TEST_USER_ID);
  });

  test('throws NotFoundError when block missing', async () => {
    mockRepo.findBlockById.mockResolvedValue(null);

    await expect(service.removeBlock(TEST_USER_ID, 'x'))
      .rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  test('throws AuthorizationError when not owner', async () => {
    mockRepo.findBlockById.mockResolvedValue(makeBlock({ user_id: OTHER_USER_ID }));

    await expect(service.removeBlock(TEST_USER_ID, 'x'))
      .rejects.toMatchObject({ code: 'AUTHORIZATION_ERROR' });
  });

  test('throws PolicyViolation when removing last block', async () => {
    const block = makeBlock();
    mockRepo.findBlockById.mockResolvedValue(block);
    mockRepo.countBlocksByDashboard.mockResolvedValue(1); // DASHBOARD_BLOCKS_MIN

    await expect(service.removeBlock(TEST_USER_ID, block.id))
      .rejects.toMatchObject({ code: 'POLICY_VIOLATION' });
    expect(mockRepo.deleteBlock).not.toHaveBeenCalled();
  });
});

// ── updateBlock ───────────────────────────────────────────────────────────────

describe('updateBlock', () => {
  test('updates block and returns updated', async () => {
    const block   = makeBlock();
    const updated = makeBlock({ ...block, title: 'Updated' });
    mockRepo.findBlockById.mockResolvedValue(block);
    mockRepo.updateBlock.mockResolvedValue(updated);

    const result = await service.updateBlock(TEST_USER_ID, block.id, { title: 'Updated' });

    expect(mockRepo.updateBlock).toHaveBeenCalledWith(
      block.id, TEST_USER_ID,
      expect.objectContaining({ title: 'Updated' })
    );
    expect(result).toBe(updated);
  });

  test('throws NotFoundError when block missing', async () => {
    mockRepo.findBlockById.mockResolvedValue(null);

    await expect(service.updateBlock(TEST_USER_ID, 'x', { title: 'y' }))
      .rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  test('throws AuthorizationError when not owner', async () => {
    mockRepo.findBlockById.mockResolvedValue(makeBlock({ user_id: OTHER_USER_ID }));

    await expect(service.updateBlock(TEST_USER_ID, 'x', { title: 'y' }))
      .rejects.toMatchObject({ code: 'AUTHORIZATION_ERROR' });
  });
});

// ── reorderBlocks ─────────────────────────────────────────────────────────────

describe('reorderBlocks', () => {
  test('reorders blocks successfully', async () => {
    const b1 = makeBlock({ row: 0, column: 0 });
    const b2 = makeBlock({ row: 0, column: 1 });
    mockRepo.findBlockById
      .mockResolvedValueOnce(b1)
      .mockResolvedValueOnce(b2);
    mockRepo.reorderBlocks.mockResolvedValue(undefined);

    const positions = [
      { block_id: b1.id, row: 1, column: 0 },
      { block_id: b2.id, row: 1, column: 1 },
    ];

    await service.reorderBlocks(TEST_USER_ID, positions);

    expect(mockRepo.reorderBlocks).toHaveBeenCalledWith(positions, TEST_USER_ID);
  });

  test('throws NotFoundError when a block is missing', async () => {
    mockRepo.findBlockById.mockResolvedValue(null);

    await expect(service.reorderBlocks(TEST_USER_ID, [{ block_id: 'x', row: 0, column: 0 }]))
      .rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  test('throws AuthorizationError when a block is not owned', async () => {
    mockRepo.findBlockById.mockResolvedValue(makeBlock({ user_id: OTHER_USER_ID }));

    await expect(service.reorderBlocks(TEST_USER_ID, [{ block_id: 'x', row: 0, column: 0 }]))
      .rejects.toMatchObject({ code: 'AUTHORIZATION_ERROR' });
  });
});
