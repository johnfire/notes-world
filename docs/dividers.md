# Dividers

Labelled separators that can be inserted into item lists to visually group content.

## What they are

A divider is a horizontal line with an optional text label. In a tag item list it sits alongside items in the drag-and-drop sort order — you can drag it anywhere in the list. It renders as a separator row rather than a content card.

Example use: open the "anti cancer things" tag, add a divider, label it "Vegetables", drag it above all the vegetable items. Add another divider labelled "Spices" above those items.

---

## Current scope

Dividers are implemented in **TagView only** (the main content panel when you click a tag in the sidebar).

**Not yet implemented:** dividers in the sidebar tag list. That requires unifying the sidebar's three separate sort contexts (`tags:folder`, `tags:file`, `tags:other`) into one `tags:all` context — tracked as a follow-on task.

---

## How to use

- **Add:** Click `+ Divider` button in the top-right of any tag view. A new unlabelled divider appears at the end of the list.
- **Label:** Hover the divider and click "add label", or click an existing label to edit it. Press Enter or click away to save. Press Escape to cancel.
- **Remove label:** Edit the label, clear the text, press Enter. Saves as null (renders as plain line).
- **Delete:** Hover the divider and click the ✕ button that appears on the right.
- **Reorder:** Drag the grip handle (⠿) on the left, same as items.

---

## Architecture

### Database

Migration `006_dividers.sql` — table `dividers`:

```
id         UUID PK
user_id    UUID NOT NULL
label      VARCHAR(100)   -- nullable
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

Dividers belong to the user, not to a specific tag. The same divider entity can appear in multiple tag view sort orders. Its position in each context is tracked independently via the sort orders domain.

### Backend

`src/server/src/domains/dividers/`

| File | Purpose |
|---|---|
| `dividers.repository.ts` | Raw SQL: insertDivider, findDividersByUser, findDividerById, updateDivider, deleteDivider |
| `dividers.service.ts` | Business logic: ownership checks on update/delete, NotFoundError / AuthorizationError |
| `dividers.controller.ts` | Express handlers using PHASE1_USER_ID |
| `dividers.routes.ts` | Mounted at `/api/dividers` |

Routes:
```
GET    /api/dividers        — list all dividers for user
POST   /api/dividers        — create divider { label? }
PATCH  /api/dividers/:id    — update label { label: string | null }
DELETE /api/dividers/:id    — delete divider
```

### Sort order ID convention

Dividers share the sort order context with items. To avoid UUID collisions, divider IDs are stored in sort order records with a prefix:

```
item ID:     "00000000-0000-0000-0000-000000000001"   (plain UUID)
divider ID:  "divider:00000000-0000-0000-0000-000000000042"
```

The frontend is responsible for resolving which IDs are items and which are dividers when rebuilding the ordered list. The sort orders backend treats all IDs as opaque strings.

### Frontend

**Types** — `src/client/src/types/index.ts`:
```ts
interface Divider {
  id: string;
  user_id: string;
  label: string | null;
  created_at: string;
  updated_at: string;
}
```

**API client** — `src/client/src/api/index.ts`:
```ts
api.dividers.list()
api.dividers.create(label?)
api.dividers.update(id, label)
api.dividers.delete(id)
```

**TagView** — `src/client/src/components/TagView.tsx`:

1. On mount, fetches items and dividers in parallel via `Promise.all`
2. `buildEntries()` merges both into a `ListEntry[]` union type:
   ```ts
   type ItemEntry    = { kind: 'item';    id: string } & Item
   type DividerEntry = { kind: 'divider'; id: string; dividerId: string; ... }
   ```
   Divider entries get `id = "divider:<uuid>"` so they occupy their own slot in sort orders.
3. The merged list is passed to `SortableList` — the sort order context is `tag:<tagId>`, same as before. Sort orders now contain a mix of item UUIDs and `divider:` prefixed IDs.
4. `renderItem` checks `entry.kind` — items render as cards, dividers render as `<DividerRow>`.

**DividerRow** — isolated component inside `TagView.tsx`:

Each divider row manages its own `editing` and `label` state locally. This is intentional and critical — if edit state lives in the parent (`TagView`), every keystroke re-renders the entire entry list, which causes `SortableList` to re-fetch sort orders and reorder the list visually. Isolation prevents both label bleed between dividers and list jumping.

`committingRef` guards against double-save: pressing Enter fires `onKeyDown` → `commit()`, then `onBlur` fires immediately after. The ref blocks the second call.

**SortableList** — `src/client/src/components/SortableList.tsx`:

`itemClassName` prop was extended to accept `string | ((item: T) => string)` to support per-item wrapper class overrides. Used by TagView to apply `col-span-3` to dividers when needed (currently removed — dividers sit in a single grid cell same as items).

---

## Tests

```
tests/unit/server/domains/dividers/dividers.service.test.ts   — 11 tests
tests/contract/server/domains/dividers/dividers.routes.test.ts — 9 tests
```

All 20 tests passing.

---

## Known limitations / follow-on work

1. **Dividers are global, not per-tag.** All dividers appear in every tag view's merged list. In practice this is fine as long as the user doesn't create hundreds of them — sort order contexts keep their positions separate per tag. If it becomes a problem, add a `context_type` or `tag_id` column to scope dividers.

2. **Sidebar dividers not yet implemented.** The sidebar needs its three sort contexts collapsed into one unified `tags:all` context before dividers can be dragged between tag groups. Tracked as a separate task.

3. **No cascade on item sort orders.** Deleting a divider deletes its `dividers` row but leaves any `divider:<id>` entries in the `item_sort_orders` table as orphans. They are harmless (the frontend just won't find a matching divider to render), but a cleanup query or FK cascade would be cleaner.
