import { Item, TaskStatus } from "../types";

// Completion is a STATUS on the item (type_data.task_status === "Done"), never a
// tag. These helpers read that status defensively: a missing, null, or garbage
// type_data — or a non-task item that has no status at all — is simply "not
// completed", so a malformed item can never break a filter or list. Worst case
// an item shows; it never throws.

/** True only when the item is a task whose status is exactly Done. */
export function isCompleted(item: Item | null | undefined): boolean {
  const td = (item as { type_data?: unknown } | null | undefined)?.type_data as
    | Record<string, unknown>
    | null
    | undefined;
  return td?.task_status === TaskStatus.Done;
}

/**
 * The view filter behind the per-tag "Hide completed" toggle: a new array with
 * completed items removed. Pure — the input is never mutated, so toggling the
 * filter off (or un-completing an item) brings every item back unchanged.
 */
export function omitCompleted(items: Item[]): Item[] {
  return items.filter((i) => !isCompleted(i));
}

/** Completion timestamp as epoch ms; 0 when missing or unparseable (sorts last). */
function completedAtTime(item: Item): number {
  const td = (item as { type_data?: unknown } | null | undefined)?.type_data as
    | Record<string, unknown>
    | null
    | undefined;
  const v = td?.completed_at;
  if (typeof v !== "string") return 0;
  const t = new Date(v).getTime();
  return Number.isNaN(t) ? 0 : t;
}

/**
 * Aggregation behind the Done view: every completed item, most-recently-completed
 * first. Items with a missing/garbage completed_at sort last (time 0), tie-broken
 * by lowercased title. Never throws on a malformed item.
 */
export function selectCompletedItems(items: Item[]): Item[] {
  return items.filter(isCompleted).sort((a, b) => {
    const d = completedAtTime(b) - completedAtTime(a);
    if (d !== 0) return d;
    return (a.title ?? "").toLowerCase().localeCompare((b.title ?? "").toLowerCase());
  });
}

// ── Per-tag "Hide completed" persistence ──────────────────────────────────────
// The toggle is stored PER TAG on the shared sort-orders endpoint (rows of opaque
// item_id strings) — exactly where per-tag sort order and collapsed dividers live
// — so it stays in sync across web and mobile with no new table or endpoint.
//
// DEFAULT IS ON (completed hidden): the absence of any stored row, or anything
// other than the explicit "shown" sentinel, reads as hidden. Only an explicit
// opt-out persists the "shown" sentinel. (Note: the sort-orders upsert ignores an
// empty array, so the value must always be a single non-empty sentinel row.)

export const HIDE_COMPLETED_SHOWN = "shown";
export const HIDE_COMPLETED_HIDDEN = "hidden";

/** Decode stored rows into the toggle state. Defaults to ON (true). */
export function decodeHideCompleted(
  rows: Array<{ item_id: string }> | null | undefined,
): boolean {
  if (!Array.isArray(rows)) return true;
  return !rows.some((r) => r?.item_id === HIDE_COMPLETED_SHOWN);
}

/** Encode the toggle state as the single sentinel row to persist. */
export function encodeHideCompleted(hidden: boolean): string[] {
  return [hidden ? HIDE_COMPLETED_HIDDEN : HIDE_COMPLETED_SHOWN];
}
