import { Dashboard, Block, UserId, BlockId, ViewType } from '../../types';
import { LIMITS } from '../../constants';
import {
  NotFoundError,
  ConflictError,
  AuthorizationError,
  LimitExceeded,
  PolicyViolation,
  ValidationError,
} from '../../utils/errors';
import * as repo from './views.repository';
import { AddBlockInput, UpdateBlockInput, BlockPosition } from './views.types';

export async function getDashboard(userId: UserId): Promise<{ dashboard: Dashboard; blocks: Block[] }> {
  let dashboard = await repo.findDashboardByUser(userId);
  if (!dashboard) {
    dashboard = await initializeDashboard(userId);
  }
  const blocks = await repo.findBlocksByDashboard(dashboard.id, userId);
  return { dashboard, blocks };
}

export async function initializeDashboard(userId: UserId): Promise<Dashboard> {
  const existing = await repo.findDashboardByUser(userId);
  if (existing) throw new ConflictError('Dashboard already exists for user');

  const dashboard = await repo.insertDashboard(userId, LIMITS.DASHBOARD_COLUMNS_DEFAULT);

  // Default layout as defined in views.ispec InitializeDashboard
  const defaultBlocks: Array<{ view_type: ViewType; title: string; row: number; col: number }> = [
    { view_type: ViewType.QuickCapture,    title: 'Quick Capture',    row: 0, col: 0 },
    { view_type: ViewType.ActionableTasks, title: 'Actionable Tasks', row: 1, col: 0 },
    { view_type: ViewType.RecentItems,     title: 'Recent Items',     row: 1, col: 1 },
    { view_type: ViewType.TagCloud,        title: 'Tags',             row: 1, col: 2 },
    { view_type: ViewType.OverdueTasks,    title: 'Overdue',          row: 2, col: 0 },
    { view_type: ViewType.BlockedTasks,    title: 'Blocked',          row: 2, col: 1 },
  ];

  for (const b of defaultBlocks) {
    await repo.insertBlock(dashboard.id, userId, b.view_type, b.title, b.row, b.col);
  }

  return dashboard;
}

export async function addBlock(userId: UserId, dashboardId: string, input: AddBlockInput): Promise<Block> {
  const dashboard = await repo.findDashboardByUser(userId);
  if (!dashboard || dashboard.id !== dashboardId) throw new NotFoundError('Dashboard', dashboardId);
  if (dashboard.user_id !== userId) throw new AuthorizationError('Not owner');

  const count = await repo.countBlocksByDashboard(dashboardId);
  if (count >= LIMITS.DASHBOARD_BLOCKS_MAX) {
    throw new LimitExceeded('Dashboard has maximum number of blocks', {
      current_count: count,
      maximum: LIMITS.DASHBOARD_BLOCKS_MAX,
    });
  }

  if (!Object.values(ViewType).includes(input.view_type)) {
    throw new ValidationError(`Unsupported view type: ${input.view_type}`);
  }

  return repo.insertBlock(dashboard.id, userId, input.view_type, input.title, input.row, input.column, input.config);
}

export async function removeBlock(userId: UserId, blockId: BlockId): Promise<void> {
  const block = await repo.findBlockById(blockId, userId);
  if (!block) throw new NotFoundError('Block', blockId);
  if (block.user_id !== userId) throw new AuthorizationError('Not owner');

  const count = await repo.countBlocksByDashboard(block.dashboard_id);
  if (count <= LIMITS.DASHBOARD_BLOCKS_MIN) {
    throw new PolicyViolation('Cannot remove the last block from a dashboard');
  }

  await repo.deleteBlock(blockId, userId);
}

export async function updateBlock(userId: UserId, blockId: BlockId, input: UpdateBlockInput): Promise<Block> {
  const block = await repo.findBlockById(blockId, userId);
  if (!block) throw new NotFoundError('Block', blockId);
  if (block.user_id !== userId) throw new AuthorizationError('Not owner');

  const updated = await repo.updateBlock(blockId, userId, {
    view_type: input.view_type,
    title:     input.title,
    row:       input.row,
    col:       input.column,
    config:    input.config,
  });
  if (!updated) throw new NotFoundError('Block', blockId);
  return updated;
}

export async function reorderBlocks(userId: UserId, positions: BlockPosition[]): Promise<void> {
  // Validate all blocks belong to same user
  for (const pos of positions) {
    const block = await repo.findBlockById(pos.block_id, userId);
    if (!block) throw new NotFoundError('Block', pos.block_id);
    if (block.user_id !== userId) throw new AuthorizationError('Not owner');
  }
  await repo.reorderBlocks(positions, userId);
}
