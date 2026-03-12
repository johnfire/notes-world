import { getPool } from '../../db/client';
import { Dependency, DependencyId, DependencyStatus, ItemId, UserId } from '../../types';

export async function insertDependency(dependentId: ItemId, dependencyId: ItemId, userId: UserId): Promise<Dependency> {
  const { rows } = await getPool().query<Dependency>(
    `INSERT INTO dependencies (dependent_id, dependency_id, user_id, status)
     VALUES ($1, $2, $3, 'Active')
     RETURNING *`,
    [dependentId, dependencyId, userId]
  );
  return rows[0];
}

export async function findDependencyById(id: DependencyId, userId: UserId): Promise<Dependency | null> {
  const { rows } = await getPool().query<Dependency>(
    `SELECT * FROM dependencies WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
  return rows[0] ?? null;
}

export async function findActiveDependency(dependentId: ItemId, dependencyId: ItemId): Promise<Dependency | null> {
  const { rows } = await getPool().query<Dependency>(
    `SELECT * FROM dependencies
     WHERE dependent_id = $1 AND dependency_id = $2 AND status = 'Active'`,
    [dependentId, dependencyId]
  );
  return rows[0] ?? null;
}

export async function findDependenciesForItem(dependentId: ItemId, userId: UserId): Promise<Dependency[]> {
  const { rows } = await getPool().query<Dependency>(
    `SELECT * FROM dependencies
     WHERE dependent_id = $1 AND user_id = $2 AND status = 'Active'
     ORDER BY created_at ASC`,
    [dependentId, userId]
  );
  return rows;
}

export async function findDependentsOfItem(dependencyId: ItemId, userId: UserId): Promise<Dependency[]> {
  const { rows } = await getPool().query<Dependency>(
    `SELECT * FROM dependencies
     WHERE dependency_id = $1 AND user_id = $2 AND status = 'Active'
     ORDER BY created_at ASC`,
    [dependencyId, userId]
  );
  return rows;
}

export async function countActiveDependencies(dependentId: ItemId): Promise<number> {
  const { rows } = await getPool().query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM dependencies
     WHERE dependent_id = $1 AND status = 'Active'`,
    [dependentId]
  );
  return parseInt(rows[0].count, 10);
}

export async function countUnresolvedDependencies(dependentId: ItemId): Promise<number> {
  // Unresolved = Active deps where the dependency item is not Done
  const { rows } = await getPool().query<{ count: string }>(
    `SELECT COUNT(*) AS count
     FROM dependencies d
     JOIN items i ON i.id = d.dependency_id
     WHERE d.dependent_id = $1
       AND d.status = 'Active'
       AND (i.type_data->>'task_status' IS NULL OR i.type_data->>'task_status' != 'Done')`,
    [dependentId]
  );
  return parseInt(rows[0].count, 10);
}

export async function updateDependencyStatus(
  id: DependencyId,
  userId: UserId,
  status: DependencyStatus,
  timestamp: string
): Promise<Dependency | null> {
  const timestampCol = status === DependencyStatus.Resolved ? 'resolved_at' : 'removed_at';
  const { rows } = await getPool().query<Dependency>(
    `UPDATE dependencies
     SET status = $3, ${timestampCol} = $4
     WHERE id = $1 AND user_id = $2
     RETURNING *`,
    [id, userId, status, timestamp]
  );
  return rows[0] ?? null;
}

// Returns all dependency_ids reachable from startId (for cycle detection)
export async function findReachableItems(startId: ItemId, userId: UserId): Promise<ItemId[]> {
  const { rows } = await getPool().query<{ dependency_id: string }>(
    `WITH RECURSIVE chain AS (
       SELECT dependency_id FROM dependencies
       WHERE dependent_id = $1 AND user_id = $2 AND status = 'Active'
       UNION
       SELECT d.dependency_id FROM dependencies d
       INNER JOIN chain c ON d.dependent_id = c.dependency_id
       WHERE d.user_id = $2 AND d.status = 'Active'
     )
     SELECT dependency_id FROM chain`,
    [startId, userId]
  );
  return rows.map(r => r.dependency_id);
}

export async function findDependencyChain(itemId: ItemId, userId: UserId): Promise<ItemId[]> {
  const { rows } = await getPool().query<{ item_id: string }>(
    `WITH RECURSIVE chain AS (
       SELECT dependency_id AS item_id, 1 AS depth FROM dependencies
       WHERE dependent_id = $1 AND user_id = $2 AND status = 'Active'
       UNION
       SELECT d.dependency_id, c.depth + 1 FROM dependencies d
       INNER JOIN chain c ON d.dependent_id = c.item_id
       WHERE d.user_id = $2 AND d.status = 'Active' AND c.depth < 20
     )
     SELECT DISTINCT item_id FROM chain`,
    [itemId, userId]
  );
  return rows.map(r => r.item_id);
}

// Cross references

export async function insertCrossReference(itemAId: ItemId, itemBId: ItemId, userId: UserId): Promise<void> {
  await getPool().query(
    `INSERT INTO cross_references (item_a_id, item_b_id, user_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (item_a_id, item_b_id) DO NOTHING`,
    [itemAId, itemBId, userId]
  );
}

export async function findCrossReferenceById(id: string, userId: UserId): Promise<CrossReferenceRow | null> {
  const { rows } = await getPool().query<CrossReferenceRow>(
    `SELECT * FROM cross_references WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
  return rows[0] ?? null;
}

export async function findCrossReferencedItems(itemId: ItemId, userId: UserId): Promise<ItemId[]> {
  const { rows } = await getPool().query<{ other_id: string }>(
    `SELECT CASE WHEN item_a_id = $1 THEN item_b_id ELSE item_a_id END AS other_id
     FROM cross_references
     WHERE (item_a_id = $1 OR item_b_id = $1) AND user_id = $2`,
    [itemId, userId]
  );
  return rows.map(r => r.other_id);
}

export async function deleteCrossReference(id: string, userId: UserId): Promise<void> {
  await getPool().query(
    `DELETE FROM cross_references WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
}

interface CrossReferenceRow {
  id: string;
  item_a_id: string;
  item_b_id: string;
  user_id: string;
  created_at: string;
}
