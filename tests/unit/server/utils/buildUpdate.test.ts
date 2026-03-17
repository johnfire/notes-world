import { buildUpdate } from '../../../../src/server/src/utils/buildUpdate';

describe('buildUpdate', () => {
  test('generates UPDATE with all fields', () => {
    const { sql, params } = buildUpdate(
      'items',
      { title: 'New Title', body: 'New Body' },
      { id: 'abc', user_id: 'u1' }
    );

    expect(sql).toBe(
      'UPDATE items SET updated_at = NOW(), title = $1, body = $2 WHERE id = $3 AND user_id = $4 RETURNING *'
    );
    expect(params).toEqual(['New Title', 'New Body', 'abc', 'u1']);
  });

  test('skips undefined fields', () => {
    const { sql, params } = buildUpdate(
      'items',
      { title: 'Hello', body: undefined, color: null },
      { id: 'abc' }
    );

    expect(sql).toBe(
      'UPDATE items SET updated_at = NOW(), title = $1, color = $2 WHERE id = $3 RETURNING *'
    );
    expect(params).toEqual(['Hello', null, 'abc']);
  });

  test('JSON-serializes fields listed in jsonFields', () => {
    const typeData = { task_status: 'Open', priority: 'High' };
    const { sql, params } = buildUpdate(
      'items',
      { type_data: typeData, title: 'Task' },
      { id: 'x' },
      { jsonFields: ['type_data'] }
    );

    expect(sql).toBe(
      'UPDATE items SET updated_at = NOW(), type_data = $1, title = $2 WHERE id = $3 RETURNING *'
    );
    expect(params[0]).toBe(JSON.stringify(typeData));
    expect(params[1]).toBe('Task');
  });

  test('handles multiple where clauses', () => {
    const { sql, params } = buildUpdate(
      'blocks',
      { title: 'Block' },
      { id: 'b1', user_id: 'u1', dashboard_id: 'd1' }
    );

    expect(sql).toContain('WHERE id = $2 AND user_id = $3 AND dashboard_id = $4');
    expect(params).toEqual(['Block', 'b1', 'u1', 'd1']);
  });

  test('only produces updated_at when no fields provided', () => {
    const { sql, params } = buildUpdate(
      'items',
      {},
      { id: 'abc' }
    );

    expect(sql).toBe(
      'UPDATE items SET updated_at = NOW() WHERE id = $1 RETURNING *'
    );
    expect(params).toEqual(['abc']);
  });

  test('handles null values in fields', () => {
    const { sql, params } = buildUpdate(
      'items',
      { color: null, archived_at: null },
      { id: 'x' }
    );

    expect(sql).toContain('color = $1, archived_at = $2');
    expect(params).toEqual([null, null, 'x']);
  });

  test('JSON-serializes null for jsonFields', () => {
    const { params } = buildUpdate(
      'items',
      { config: null },
      { id: 'x' },
      { jsonFields: ['config'] }
    );

    expect(params[0]).toBe('null');
  });
});
