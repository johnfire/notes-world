import { Item } from '../../types';

export type DateField = 'due_date' | 'start_date';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Compact absolute date: "Jun 18", or "Jun 18 '27" when the year differs from now. */
export function formatDueShort(date: string): string {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const base = `${MONTHS[d.getMonth()]} ${d.getDate()}`;
  return d.getFullYear() === new Date().getFullYear()
    ? base
    : `${base} '${String(d.getFullYear()).slice(-2)}`;
}

/** The chosen date field off an item's type_data, or undefined when absent. */
export function dateOf(item: Item, field: DateField): string | undefined {
  const td = item.type_data as Record<string, string | undefined> | null;
  return td?.[field] || undefined;
}

function dateTime(item: Item, field: DateField): number | null {
  const v = dateOf(item, field);
  if (!v) return null;
  const t = new Date(v).getTime();
  return Number.isNaN(t) ? null : t;
}

/**
 * Returns a new array: dated items ascending by the chosen date field, then
 * undated items, with equal dates (and the undated group) tie-broken by
 * lowercased title. An invalid date is treated as undated so one malformed
 * item can never break the ordering.
 */
export function sortItemsByDate(items: Item[], field: DateField): Item[] {
  return [...items].sort((a, b) => {
    const ta = dateTime(a, field);
    const tb = dateTime(b, field);
    if (ta !== null && tb !== null) {
      if (ta !== tb) return ta - tb;
      return a.title.toLowerCase().localeCompare(b.title.toLowerCase());
    }
    if (ta !== null) return -1;
    if (tb !== null) return 1;
    return a.title.toLowerCase().localeCompare(b.title.toLowerCase());
  });
}
