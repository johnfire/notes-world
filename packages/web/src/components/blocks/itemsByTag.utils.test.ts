import { describe, expect, it } from 'vitest';
import { ItemType, ItemStatus, type Item } from '../../types';
import { formatDueShort, sortItemsByDue } from './itemsByTag.utils';

function task(id: string, title: string, due?: string): Item {
  return {
    id,
    user_id: 'u1',
    title,
    item_type: ItemType.Task,
    status: ItemStatus.Active,
    type_data: due ? { due_date: due } : undefined,
    created_at: '',
    updated_at: '',
  } as Item;
}

describe('formatDueShort', () => {
  it('shows month and day for the current year', () => {
    const now = new Date();
    const d = new Date(now.getFullYear(), 5, 18); // Jun 18
    expect(formatDueShort(d.toISOString())).toBe('Jun 18');
  });

  it('appends a 2-digit year when the year differs from now', () => {
    const otherYear = new Date().getFullYear() + 1;
    const d = new Date(otherYear, 5, 18);
    expect(formatDueShort(d.toISOString())).toBe(`Jun 18 '${String(otherYear).slice(-2)}`);
  });

  it('returns empty string for an invalid date', () => {
    expect(formatDueShort('not-a-date')).toBe('');
  });
});

describe('sortItemsByDue', () => {
  it('orders dated tasks ascending, undated last', () => {
    const items = [
      task('a', 'Alpha'),                         // undated
      task('c', 'Charlie', '2026-03-01T00:00:00Z'),
      task('b', 'Bravo',   '2026-01-01T00:00:00Z'),
    ];
    expect(sortItemsByDue(items).map(i => i.id)).toEqual(['b', 'c', 'a']);
  });

  it('tie-breaks equal dates by title', () => {
    const items = [
      task('z', 'Zebra', '2026-01-01T00:00:00Z'),
      task('m', 'Mango', '2026-01-01T00:00:00Z'),
    ];
    expect(sortItemsByDue(items).map(i => i.id)).toEqual(['m', 'z']);
  });

  it('treats an invalid due_date as undated', () => {
    const items = [
      task('bad', 'Bad', 'not-a-date'),
      task('good', 'Good', '2026-01-01T00:00:00Z'),
    ];
    expect(sortItemsByDue(items).map(i => i.id)).toEqual(['good', 'bad']);
  });

  it('does not mutate the input array', () => {
    const items = [task('a', 'A', '2026-02-01T00:00:00Z'), task('b', 'B', '2026-01-01T00:00:00Z')];
    const before = items.map(i => i.id);
    sortItemsByDue(items);
    expect(items.map(i => i.id)).toEqual(before);
  });
});
