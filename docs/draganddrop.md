# Drag and Drop — Implementation Reference

## Overview

Drag-and-drop reordering is implemented via `useSortableList` (hook) and `SortableList` (component wrapper). Items are persisted to `sort_orders` in the database via the `/api/sort-orders` endpoint.

---

## Files

| File | Role |
|---|---|
| `src/client/src/hooks/useSortableList.ts` | Core drag-drop logic, sort order fetch/save |
| `src/client/src/components/SortableList.tsx` | Generic wrapper that renders a list with grip handles |
| `src/client/src/components/TagView.tsx` | Consumer — 3-col grid with items + dividers |
| `src/client/src/api/index.ts` | `api.sortOrders.get(contextKey)` and `api.sortOrders.save(contextKey, ids)` |

---

## Architecture

### `useSortableList<T extends HasId>(items, contextKey, extraDragData?)`

Stores **only ordered IDs** (not full objects). Item data is always looked up fresh from the `items` prop. This means label edits to a divider don't interfere with drag order.

**State:**
- `orderedIds: string[]` — the authoritative render order
- `dragId` — ID of item currently being dragged
- `dragOverId` — ID of item being hovered over as drop target

**Refs (not state — don't trigger re-renders):**
- `dragIdRef` — same as dragId but readable inside event handlers
- `isDragging` — true from dragstart to dragend; blocks the sort effect from overwriting orderedIds
- `dropFiredRef` — reset on dragstart, set true on first drop; guards against duplicate drop events
- `lastDropTime` — timestamp of most recent drop; used to reject stale server fetches
- `instanceKey` — unique ID per hook instance (e.g. `sortable-1`); written to `dataTransfer` to reject cross-list drops

### Instance Key (cross-list drop rejection)

Multiple `SortableList` instances exist on the page simultaneously (TagView + sidebar). Each instance writes its own `instanceKey` to `dataTransfer` under the key `application/x-sortable-source`. On drop, if the source instance key doesn't match, the drop is silently ignored.

This prevents a drop in TagView from also firing on the sidebar list.

### Sort Effect

Runs when `itemsKey` (sorted IDs) or `contextKey` changes. Fetches saved sort order from server and re-orders `orderedIds` accordingly.

Guards:
1. `isDragging.current` — skip if mid-drag
2. `cancelled` (closure) — skip if component unmounted or deps changed before fetch resolved
3. `lastDropTime.current > effectStartTime` — skip if a drop happened after this fetch started

### Drop Logic

`handleDrop` reads `fromId` from `dataTransfer` (falls back to `dragIdRef`). It uses `setOrderedIds(prev => ...)` functional update so it always operates on the latest state. After reordering, calls `saveOrder` (debounced 100ms).

The `dragend` event fires on the source element **before** `drop` fires on the target — this is normal browser behavior. `isDragging` is cleared in `dragend`, which means the sort effect's stale-check guard relies on `lastDropTime` rather than `isDragging`.

---

## Known Bugs / Remaining Issues

### Phantom coupling between items (partial — ~65% fixed as of 2026-03-15)

**Symptom:** Dragging one item sometimes causes a second item to also move.

**Root cause (identified):** The sort effect fires after `dragend` clears `isDragging`, and if the debounced `saveOrder` hasn't completed yet, the server fetch returns old data and overwrites `orderedIds`. The `lastDropTime` guard mitigates this but has a race: if the save debounce (100ms) + network round trip completes and a new `itemsKey` change triggers the effect within that window, the guard won't fire.

**Secondary cause (fixed):** Two `useSortableList` instances (TagView + sidebar) both had `onDrop` handlers receiving the same `dragend`/`drop` events. Fixed by instance key check.

**What still happens:** Occasionally, especially with rapid successive drags, the sort effect fires between two drag gestures and resets `orderedIds` to a server state that doesn't reflect the first drop yet (if the debounced save is still pending).

### Potential fix direction

Replace the debounce-then-fetch loop with a server-first approach: save immediately on drop (no debounce), then in the sort effect, check a version counter rather than a timestamp. Or: suppress the sort effect entirely while there's a pending save inflight.

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

Context key format: `tag:<uuid>` (one per tag view).

Sort orders are saved as integer positions (0-indexed) per item ID. On load, items not in the sort order are appended at the end sorted by title. Dividers (item_type = 'Divider') are stored as items with the same sort order mechanism — no special handling needed.

The `item_sort_orders.item_id` column is `TEXT` (not UUID) so it can store arbitrary string IDs if needed in future.

---

## Dividers

Dividers are items with `item_type = 'Divider'`. Their `title` is the label (empty string = no label). They appear inline in the TagView grid (same cell size as regular items) and can be dragged to any position.

`DividerRow` is an isolated component with its own edit state so label edits don't cause the parent list to re-render and interfere with drag state.
