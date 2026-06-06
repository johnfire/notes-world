/**
 * Builds a parameterized UPDATE query from a partial fields object.
 * Only includes fields whose value is not undefined.
 *
 * Returns { sql, params } where sql is a full UPDATE ... RETURNING * statement.
 */

// Table/column names are interpolated into the SQL string (they cannot be bound
// parameters), so every identifier must be a plain SQL identifier. This is a
// fail-closed guard: even if a caller forgot to pass `allowedFields`, a
// user-controlled key like "x = NOW(), is_admin = true --" is rejected here
// rather than becoming injectable SQL. Values are always parameterized.
const SQL_IDENTIFIER = /^[a-z_][a-z0-9_]*$/i;
function assertIdentifier(name: string): void {
  if (!SQL_IDENTIFIER.test(name)) {
    throw new Error(`buildUpdate: unsafe SQL identifier "${name}"`);
  }
}

export function buildUpdate(
  table: string,
  fields: Record<string, unknown>,
  where: Record<string, unknown>,
  options?: { jsonFields?: string[]; allowedFields?: string[] },
): { sql: string; params: unknown[] } {
  assertIdentifier(table);

  const sets: string[] = ["updated_at = NOW()"];
  const params: unknown[] = [];
  let i = 1;

  const jsonFields = new Set(options?.jsonFields ?? []);
  const allowedFields = options?.allowedFields
    ? new Set(options.allowedFields)
    : null;

  for (const [col, val] of Object.entries(fields)) {
    if (val === undefined) continue;
    if (allowedFields && !allowedFields.has(col)) continue;
    assertIdentifier(col);
    sets.push(`${col} = $${i++}`);
    params.push(jsonFields.has(col) ? JSON.stringify(val) : val);
  }

  const whereClauses: string[] = [];
  for (const [col, val] of Object.entries(where)) {
    assertIdentifier(col);
    whereClauses.push(`${col} = $${i++}`);
    params.push(val);
  }

  const sql = `UPDATE ${table} SET ${sets.join(", ")} WHERE ${whereClauses.join(" AND ")} RETURNING *`;
  return { sql, params };
}
