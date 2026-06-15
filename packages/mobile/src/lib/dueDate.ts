// Due-date display + sort helpers, ported from the web app's
// components/blocks/itemsByTag.utils.ts so the two platforms behave the same.
import type { Item } from "@notes-world/shared";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** Compact absolute due date: "Jun 18", or "Jun 18 '27" when the year differs from now. */
export function formatDueShort(dueDate: string): string {
  const d = new Date(dueDate);
  if (Number.isNaN(d.getTime())) return "";
  const base = `${MONTHS[d.getMonth()]} ${d.getDate()}`;
  return d.getFullYear() === new Date().getFullYear()
    ? base
    : `${base} '${String(d.getFullYear()).slice(-2)}`;
}

function dueTime(item: Item): number | null {
  const td = item.type_data as { due_date?: string } | null | undefined;
  if (!td?.due_date) return null;
  const t = new Date(td.due_date).getTime();
  return Number.isNaN(t) ? null : t;
}

/**
 * Returns a new array: dated items ascending by due date, then undated items,
 * with equal dates (and the undated group) tie-broken by lowercased title.
 */
export function sortItemsByDue(items: Item[]): Item[] {
  return [...items].sort((a, b) => {
    const ta = dueTime(a);
    const tb = dueTime(b);
    if (ta !== null && tb !== null) {
      if (ta !== tb) return ta - tb;
      return a.title.toLowerCase().localeCompare(b.title.toLowerCase());
    }
    if (ta !== null) return -1;
    if (tb !== null) return 1;
    return a.title.toLowerCase().localeCompare(b.title.toLowerCase());
  });
}
