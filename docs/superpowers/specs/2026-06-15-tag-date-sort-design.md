# Dates in tag rows + date-sort toggle for Items-by-Tag blocks

**Date:** 2026-06-15
**Status:** Approved design, ready for implementation plan
**Scope:** Web only (`packages/web`, `packages/shared`). No server, no migration, no mobile.

## Problem

Tasks store a `due_date` (in `type_data` / `TaskTypeData`), but it is only visible in the
item drawer — never in list rows. The `ItemsByTag` dashboard block shows only the task
title and orders items by the user's manual drag order (`item_sort_orders`), falling back
to title. There is no way to see a task's date in the list, nor to order a tag's tasks
chronologically (e.g. a "0-startup-plan" tag with 21 dated tasks that should read
earliest → latest).

## Goals

1. Show a task's due date inline in `ItemsByTag` rows when the task has one.
2. Let each `ItemsByTag` block be toggled between **Manual** (drag) and **By date ↑**
   ordering, persisted per block.

## Non-goals

- No mobile changes (the mobile app has no sortable tag list yet).
- No server/SQL/migration changes — sorting is done client-side on already-fetched items.
- No changes to how dates are entered/edited (the item drawer already does that).
- No global sort change — only the `ItemsByTag` block is affected.

## Design

### Data model

No schema change. `due_date` already lives in `type_data` (`TaskTypeData.due_date`).

Add one optional field to `BlockConfig` in `packages/shared/src/types/index.ts`:

```ts
sort_mode?: 'manual' | 'due_date'; // undefined ⇒ 'manual' (preserves current behavior)
```

`BlockConfig` is already persisted as JSONB and round-tripped through
`api.dashboard.updateBlock(blockId, { config })`.

### Sorting (client-side)

`tags.getItemsForTag` returns full `Item` rows including `type_data`, so no server work is
needed. In `ItemsByTag`, after fetching:

- **Manual mode** (`sort_mode !== 'due_date'`): use items in server order (existing behavior),
  rendered through `SortableList` with drag enabled.
- **Date mode** (`sort_mode === 'due_date'`): sort a copy of the items:
  1. Tasks **with** a `due_date`, ascending by `new Date(due_date).getTime()`.
  2. Tasks **without** a `due_date` after them, ascending by `LOWER(title)`.
  3. Tie-break equal dates by `LOWER(title)` for stable output.

"Has a date" means `type_data?.due_date` is a non-empty string that parses to a valid date;
anything else is treated as undated. Non-task items (notes, ideas) have no `due_date` and
therefore fall to the undated group.

### Date display in rows

A compact, right-aligned absolute date is shown on a row **only when** the item has a valid
`due_date`. Shown in **both** modes (it is informational, not tied to sorting).

Helper `formatDueShort(dueDate: string): string`:

- Same year as today → `"Jun 18"`.
- Different year → `"Jun 18 '27"`.

Implemented alongside the existing `formatDue` pattern used by `OverdueTasks.tsx`. Month is
the locale-independent 3-letter English abbreviation to keep the helper trivially testable.

### Toggle UI

A small segmented control in the `ItemsByTag` block header (next to the title): two segments,
**Manual** and **Date**. Clicking the inactive segment:

1. Calls `api.dashboard.updateBlock(block.id, { config: { ...block.config, sort_mode } })`.
2. Updates local block state / sort mode so the list re-sorts immediately (optimistic;
   the call persists in the background).

The `updateBlock` API already exists in `packages/web/src/api/index.ts` but was not yet wired
to any UI; this is its first consumer.

### Drag interaction in date mode

Manual order is meaningless while sorting by date, so date mode renders a **plain static list**
(same row markup, no drag handle) instead of `SortableList`. Switching back to Manual restores
`SortableList` (drag + server order). No writes to `item_sort_orders` happen in date mode.

## Components touched

- `packages/shared/src/types/index.ts` — add `sort_mode` to `BlockConfig`.
- `packages/web/src/components/blocks/ItemsByTag.tsx` — sort logic, header toggle, date in rows,
  static-vs-sortable list switch.
- `formatDueShort` helper — colocated with `ItemsByTag` (or a shared date util if one fits).
- Test file for the sort + `formatDueShort` helper.

## Testing

Unit tests for the pure helpers:

- `formatDueShort`: same-year → `"Jun 18"`; other-year → `"Jun 18 '27"`.
- Date sort: dated tasks ascending; undated tasks land after all dated tasks; equal dates
  tie-break by title; invalid/empty `due_date` treated as undated.

## Edge cases

- Empty tag / no dated tasks: date mode behaves like a title-sorted list.
- Item with malformed `due_date`: treated as undated (bottom), no crash.
- Mixed item types under one tag: only tasks carry dates; the rest sort as undated.
