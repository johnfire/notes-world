import { Dashboard, Block, BlockConfig, UserId, DashboardId, BlockId, ViewType } from '../../types';
import { query, queryOne, withTransaction } from '../../db/client';
import { buildUpdate } from '../../utils/buildUpdate';
import { BlockPosition } from './views.types';

export async function findDashboardByUser(userId: UserId): Promise<Dashboard | null> {
  return queryOne<Dashboard>('SELECT * FROM dashboards WHERE user_id = $1', [userId]);
}

export async function insertDashboard(userId: UserId, columns = 3): Promise<Dashboard> {
  const rows = await query<Dashboard>(
    'INSERT INTO dashboards (user_id, columns) VALUES ($1, $2) RETURNING *',
    [userId, columns]
  );
  return rows[0];
}

export async function findBlocksByDashboard(dashboardId: DashboardId, userId: UserId): Promise<Block[]> {
  return query<Block>(
    'SELECT * FROM blocks WHERE dashboard_id = $1 AND user_id = $2 ORDER BY row ASC, col ASC',
    [dashboardId, userId]
  );
}

export async function countBlocksByDashboard(dashboardId: DashboardId): Promise<number> {
  const rows = await query<{ count: string }>(
    'SELECT COUNT(*)::int AS count FROM blocks WHERE dashboard_id = $1',
    [dashboardId]
  );
  return parseInt(rows[0]?.count ?? '0', 10);
}

export async function insertBlock(
  dashboardId: DashboardId,
  userId: UserId,
  viewType: ViewType,
  title: string | undefined,
  row: number,
  col: number,
  config?: BlockConfig
): Promise<Block> {
  const rows = await query<Block>(
    `INSERT INTO blocks (dashboard_id, user_id, view_type, title, row, col, config)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [dashboardId, userId, viewType, title ?? null, row, col, config ? JSON.stringify(config) : null]
  );
  return rows[0];
}

export async function findBlockById(id: BlockId, userId: UserId): Promise<Block | null> {
  return queryOne<Block>('SELECT * FROM blocks WHERE id = $1 AND user_id = $2', [id, userId]);
}

export async function updateBlock(
  id: BlockId,
  userId: UserId,
  fields: { view_type?: string; title?: string; row?: number; col?: number; config?: BlockConfig }
): Promise<Block | null> {
  const { sql, params } = buildUpdate(
    'blocks',
    fields,
    { id, user_id: userId },
    { jsonFields: ['config'] }
  );
  return queryOne<Block>(sql, params);
}

export async function deleteBlock(id: BlockId, userId: UserId): Promise<void> {
  await query('DELETE FROM blocks WHERE id = $1 AND user_id = $2', [id, userId]);
}

export async function reorderBlocks(positions: BlockPosition[], userId: UserId): Promise<void> {
  await withTransaction(async (client) => {
    for (const pos of positions) {
      await client.query(
        'UPDATE blocks SET row = $1, col = $2, updated_at = NOW() WHERE id = $3 AND user_id = $4',
        [pos.row, pos.column, pos.block_id, userId]
      );
    }
  });
}
