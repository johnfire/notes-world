# Dividers

Updated: 2026-03-15

Labelled separators that can be inserted into item lists to visually group content.

## What they are

A divider is an item with `item_type = 'Divider'`. It renders as a horizontal line with an optional text label instead of a content card. In a tag item list it sits alongside regular items in the drag-and-drop sort order — you can drag it anywhere in the list.

Example use: open the "anti cancer things" tag, add a divider, label it "Vegetables", drag it above all the vegetable items. Add another divider labelled "Spices" above those items.

---

## Current scope

Dividers are implemented in **TagView only** (the main content panel when you click a tag in the sidebar).

**Not yet implemented:** dividers in the sidebar tag list.

---

## How to use

- **Add:** Click `+ Divider` button in the top-right of any tag view. A new unlabelled divider appears at the end of the list.
- **Label:** Hover the divider and click "label", or click an existing label to edit it. Press Enter or click away to save. Press Escape to cancel.
- **Remove label:** Edit the label, clear the text, press Enter. Saves as empty string (renders as plain line).
- **Delete:** Hover the divider and click the ✕ button. Archives the divider (moves to trash).
- **Reorder:** Drag the grip handle (⠿) on the left, same as items.

---

## Architecture

### Database

Dividers are rows in the `items` table with `item_type = 'Divider'`. No separate table.

- `title` = label (empty string for unlabelled)
- `body` = null
- `status` = Active/Archived (same as any item)
- Created via `POST /api/items/divider`

### Backend

No separate domain. Dividers use the items domain:

- `POST /api/items/divider` — creates an item with type Divider and empty title
- `PATCH /api/items/:id` — update label (title field)
- `POST /api/items/:id/archive` — delete (archive) a divider

Dividers are excluded from search results and recent items queries.

### Frontend

**TagView** — `src/client/src/components/TagView.tsx`:

1. Fetches items for tag (includes dividers since they're tagged items)
2. Passes all items to `SortableList`
3. `renderItem` checks `item.item_type === ItemType.Divider` — dividers render as `<DividerRow>`, regular items render as cards

**DividerRow** — isolated component inside `TagView.tsx`:

Each divider row manages its own `editing` and `label` state locally. This is intentional — if edit state lives in the parent (`TagView`), every keystroke re-renders the entire list and interferes with sort order.

`committingRef` guards against double-save: pressing Enter fires `onKeyDown` → `commit()`, then `onBlur` fires immediately after. The ref blocks the second call.

---

## Known limitations / follow-on work

1. **Sidebar dividers not yet implemented.** The sidebar would need its sort contexts unified before dividers can work there.

2. **Orphan sort order entries.** Archiving a divider leaves its ID in `item_sort_orders`. Harmless (the frontend skips IDs it can't find in the items list), but a cleanup query would be cleaner.
