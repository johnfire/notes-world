# Drag and Drop — Implementation Reference

Updated: 2026-03-15

## Overview

Drag-and-drop reordering is implemented via `useSortableList` (hook) and `SortableList` (component wrapper). Items are persisted to `sort_orders` in the database via the `/api/sort-orders` endpoint.

---

## Files

| File | Role |
|---|---|
| `src/client/src/hooks/useSortableList.ts` | Core drag-drop logic, sort order fetch/save |
| `src/client/src/components/SortableList.tsx` | Generic wrapper that renders a list with grip handles |
| `src/client/src/components/TagView.tsx` | Consumer — single-column layout with items + dividers |
| `src/client/src/api/index.ts` | `api.sortOrders.get(contextKey)` and `api.sortOrders.save(contextKey, ids)` |

---

## Architecture

### `useSortableList<T extends HasId>(items, contextKey, extraDragData?)`

Stores **only ordered IDs** (not full objects). Item data is always looked up fresh from the `items` prop. This means label edits to a divider don't interfere with drag order.

**State:**
- `orderedIds: string[]` — the authoritative render order
- `dragId` — ID of item currently being dragged
- `dragOverId` — ID of item being hovered over as drop target
- `loaded` — flag to prevent items-sync effect from running before initial fetch

**Refs (not state — don't trigger re-renders):**
- `dragIdRef` — same as dragId but readable inside event handlers without stale closures
- `instanceKey` — unique ID per hook instance (e.g. `sortable-1`); written to `dataTransfer` to reject cross-list drops

### Design: single fetch, local authority

The hook fetches saved sort order **once per contextKey** on mount. After that, the local `orderedIds` state is the single source of truth. There is no sort effect that re-fetches — this eliminates the race conditions that plagued earlier versions.

When the `items` prop changes (item added, deleted, refreshed), a sync effect patches `orderedIds`:
- Removes IDs no longer in items
- Appends new IDs at the end
- No server round trip needed

### Instance Key (cross-list drop rejection)

Multiple `SortableList` instances exist on the page simultaneously (TagView + 3 sidebar sections). Each instance writes its own `instanceKey` to `dataTransfer` under the key `application/x-sortable-source`. On drop, if the source instance key doesn't match, the drop is silently ignored.

### Drop Logic

`handleDrop` reads `fromId` from `dataTransfer` (falls back to `dragIdRef`). It uses `setOrderedIds(prev => ...)` functional update so it always operates on the latest state. After reordering, fires a **synchronous, non-debounced save** — fire-and-forget PUT to the server.

### Save: immediate, no debounce

Earlier versions used a 100ms debounce which created race windows. Now saves are immediate fire-and-forget. A single PUT per drop is cheap and eliminates timing issues.

---

## Layout

TagView currently uses **single-column layout** (`flex flex-col gap-2`). Earlier versions used a 3-column CSS grid, but grid reflow when items shift position causes visual confusion — items appear to "jump" between columns even though the logical order is correct. Single-column eliminates this.

If 3-column is desired in the future, animated transitions (e.g. framer-motion layout animations) would make the reflow intuitive.

---

## DataTransfer Keys Used

| Key | Value | Purpose |
|---|---|---|
| `text/plain` | item ID | Source item ID (readable after dragend) |
| `application/x-sortable-source` | instance key | Reject drops from other lists |
| `application/x-item-id` | item ID | Consumed by sidebar drop handler |
| `application/x-from-tag-id` | tag ID | Consumed by sidebar to know source tag |

---

## Sort Order Persistence

Context key format: `tag:<uuid>` (one per tag view), `tags:folder`, `tags:file`, `tags:other` (sidebar sections).

Sort orders are saved as integer positions (0-indexed) per item ID. On load, items not in the sort order are appended at the end. Dividers (item_type = 'Divider') are stored as items with the same sort order mechanism — no special handling needed.

The `item_sort_orders.item_id` column is `TEXT` (not UUID) so it can store arbitrary string IDs if needed in future.

---

## Dividers

Dividers are items with `item_type = 'Divider'`. Their `title` is the label (empty string = no label). They appear inline in the TagView list (same width as regular items) and can be dragged to any position.

`DividerRow` is an isolated component with its own edit state so label edits don't cause the parent list to re-render and interfere with drag state.

---

## Debugging

Console logs are currently present in `useSortableList.ts` for `[drop]` and `[sync effect]` events. These were left intentionally for ongoing debugging. Remove when drag-and-drop is stable.

---

## History of bugs and fixes

1. **Cross-list event leakage** — drops in TagView also fired on sidebar lists. Fixed by instance key in `dataTransfer`.
2. **Sort effect overwriting drop results** — the sort effect re-fetched from server after every `itemsKey` change, racing with the debounced save. Fixed by eliminating the re-fetch pattern entirely — load once, then local state is authoritative.
3. **`dragend` firing before `drop`** — browser fires `dragend` on the source element before `drop` fires on the target. Earlier code cleared `isDragging` in `dragend`, unblocking the sort effect prematurely. No longer relevant since the sort effect was removed.
4. **3-column grid reflow confusion** — moving an item in a 3-col grid shifts all items between old and new positions by one cell, causing column jumps. Fixed by switching to single-column layout.
