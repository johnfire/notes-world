import { Item, TypeData, TaskStatus } from "../types";

export type DateField = "due_date" | "start_date";

// Workflow order used when sorting tasks by status: the kanban lifecycle with
// finished work last. Non-task items (and tasks with an unrecognised status)
// rank after every known status, tie-broken by title.
const STATUS_ORDER: Record<string, number> = {
  [TaskStatus.Open]: 0,
  [TaskStatus.InProgress]: 1,
  [TaskStatus.Blocked]: 2,
  [TaskStatus.Done]: 3,
};

function statusRank(item: Item): number {
  const td = item.type_data as Record<string, string | undefined> | null | undefined;
  const s = td?.task_status;
  return s !== undefined && s in STATUS_ORDER ? STATUS_ORDER[s] : Infinity;
}

/**
 * Returns a new array ordered by task status (Open → InProgress → Blocked →
 * Done), with non-task items last, every group tie-broken by lowercased title.
 */
export function sortItemsByStatus(items: Item[]): Item[] {
  return [...items].sort((a, b) => {
    const ra = statusRank(a);
    const rb = statusRank(b);
    if (ra !== rb) return ra - rb;
    return a.title.toLowerCase().localeCompare(b.title.toLowerCase());
  });
}

/**
 * Merge a single date field into an item's existing type_data and return the
 * whole blob. The server replaces type_data wholesale, so callers must send the
 * full object — this preserves sibling keys (task_status, priority, …). A null
 * value clears the field.
 */
export function mergeTypeData(
  existing: TypeData | Record<string, unknown> | null | undefined,
  field: DateField,
  value: string | null,
): Record<string, unknown> {
  const merged: Record<string, unknown> = {
    ...((existing as Record<string, unknown> | null | undefined) ?? {}),
  };
  if (value) merged[field] = value;
  else delete merged[field];
  return merged;
}

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

/**
 * Parse a stored date value into a Date. A plain "YYYY-MM-DD" is parsed in
 * LOCAL time (not UTC), so a date the user picked as the 18th never displays as
 * the 17th in negative-UTC zones. Full ISO timestamps keep their own offset.
 */
function parseDateValue(value: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(value);
}

/** Compact absolute date: "Jun 18", or "Jun 18 '27" when the year differs from now. */
export function formatDueShort(date: string): string {
  const d = parseDateValue(date);
  if (Number.isNaN(d.getTime())) return "";
  const base = `${MONTHS[d.getMonth()]} ${d.getDate()}`;
  return d.getFullYear() === new Date().getFullYear()
    ? base
    : `${base} '${String(d.getFullYear()).slice(-2)}`;
}

/** True when a date is strictly before today (local). Today itself is not overdue. */
export function isOverdue(date: string): boolean {
  const d = parseDateValue(date);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return d.getTime() < startOfToday.getTime();
}

/** The chosen date field off an item's type_data, or undefined when absent. */
export function dateOf(item: Item, field: DateField): string | undefined {
  const td = item.type_data as Record<string, string | undefined> | null | undefined;
  return td?.[field] || undefined;
}

function dateTime(item: Item, field: DateField): number | null {
  const v = dateOf(item, field);
  if (!v) return null;
  const t = parseDateValue(v).getTime();
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
