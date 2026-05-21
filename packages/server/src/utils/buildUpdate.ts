/**
 * Builds a parameterized UPDATE query from a partial fields object.
 * Only includes fields whose value is not undefined.
 *
 * Returns { sql, params } where sql is a full UPDATE ... RETURNING * statement.
 */
export function buildUpdate(
  table: string,
  fields: Record<string, unknown>,
  where: Record<string, unknown>,
  options?: { jsonFields?: string[] }
): { sql: string; params: unknown[] } {
  const sets: string[] = ['updated_at = NOW()'];
  const params: unknown[] = [];
  let i = 1;

  const jsonFields = new Set(options?.jsonFields ?? []);

  for (const [col, val] of Object.entries(fields)) {
    if (val === undefined) continue;
    sets.push(`${col} = $${i++}`);
    params.push(jsonFields.has(col) ? JSON.stringify(val) : val);
  }

  const whereClauses: string[] = [];
  for (const [col, val] of Object.entries(where)) {
    whereClauses.push(`${col} = $${i++}`);
    params.push(val);
  }

  const sql = `UPDATE ${table} SET ${sets.join(', ')} WHERE ${whereClauses.join(' AND ')} RETURNING *`;
  return { sql, params };
}
