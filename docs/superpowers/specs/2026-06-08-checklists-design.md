# Checklists (Shopping Lists) — Design

**Date:** 2026-06-08
**Status:** approved
**Author:** brainstormed with Christopher

## Purpose

A new kind of list, distinct from tags. A checklist has a name (e.g. "Groceries",
"Art Supplies") and holds simple line items, each with a name and a checkbox.
Items persist once added — you toggle the checkbox over time. `checked` means
"have it / got it"; unchecked (the default) means "still need it." This is for
recurring shopping lists, not one-off task tracking.

Checklists are deliberately separate from the items/tags/notes universe — they do
not appear in search, recent items, dashboards, or the untyped-item space.

## Scope

In scope (v1):

- Web app (React SPA)
- Mobile app (Expo) — **Android AAB build is the top priority**
- MCP server (AI access)

Out of scope (v1):

- Drag-and-drop reordering of lists or items (items simply append to the bottom).
  A reorder endpoint can be added later; `sort_order` columns exist to support it.
- Sharing checklists between users.
- Hiding/moving checked items — checked rows stay in place, shown with a checkmark.

## Approach

Dedicated `checklists` + `checklist_items` tables with a new backend domain,
following the existing controller/service/repository pattern. Chosen over reusing
items+tags (would pollute the notes universe) and over a single-table JSONB array
(per-item toggling would require read-modify-write of the whole array, which is
race-prone and awkward for MCP single-item updates).

## Data Model

Migration `packages/server/src/db/migrations/016_checklists.sql`:

```sql
CREATE TABLE checklists (
  id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID         NOT NULL,
  title       VARCHAR(300) NOT NULL,
  sort_order  INTEGER      NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_checklists_user_id ON checklists (user_id);

CREATE TABLE checklist_items (
  id            UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  checklist_id  UUID         NOT NULL REFERENCES checklists (id) ON DELETE CASCADE,
  user_id       UUID         NOT NULL,
  name          VARCHAR(300) NOT NULL,
  checked       BOOLEAN      NOT NULL DEFAULT FALSE,
  sort_order    INTEGER      NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_checklist_items_checklist ON checklist_items (checklist_id);
```

Notes:

- `checked` defaults to `FALSE` = "still need it"; ticking = "got it."
- `ON DELETE CASCADE` removes a list's items when the list is deleted.
- `user_id` on both tables per the project's multi-tenancy convention (ADR-005);
  every query is scoped by `user_id`.
- New items append using `MAX(sort_order) + 1` within the list.

## Shared Types

Add to `packages/shared/src/types/index.ts`:

```typescript
export type ChecklistId = string;

export interface ChecklistItem {
  id: string;
  checklist_id: ChecklistId;
  name: string;
  checked: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Checklist {
  id: ChecklistId;
  user_id: UserId;
  title: string;
  sort_order: number;
  items?: ChecklistItem[]; // present on detail fetch
  item_count?: number; // present on list fetch
  checked_count?: number; // present on list fetch
  created_at: string;
  updated_at: string;
}
```

Zod validation schemas for request bodies live alongside the domain (server) and
`packages/shared/src/schemas` if shared validation is warranted.

## API

New backend domain `packages/server/src/domains/checklists/` with
`checklists.routes.ts`, `checklists.controller.ts`, `checklists.service.ts`,
`checklists.repository.ts`. Mounted in `app.ts`:

```typescript
app.use("/api/checklists", checklistsRouter);
```

Item-level operations are nested under their list (one cohesive router, no second
top-level mount):

| Method | Endpoint                            | Purpose                                                 |
| ------ | ----------------------------------- | ------------------------------------------------------- |
| GET    | `/api/checklists`                   | List all checklists with `item_count` / `checked_count` |
| POST   | `/api/checklists`                   | Create a list `{ title }`                               |
| GET    | `/api/checklists/:id`               | One list with its items (ordered by `sort_order`)       |
| PATCH  | `/api/checklists/:id`               | Rename `{ title }`                                      |
| DELETE | `/api/checklists/:id`               | Delete list (cascades items)                            |
| POST   | `/api/checklists/:id/items`         | Add item `{ name }` (appends)                           |
| PATCH  | `/api/checklists/:id/items/:itemId` | Update `{ name?, checked? }` — the toggle               |
| DELETE | `/api/checklists/:id/items/:itemId` | Remove an item                                          |

All handlers wrapped in `wrapAsync`, all queries parameterized and scoped by
`req.userId`. A user can only read/modify their own lists and items (item
operations verify the parent list belongs to the user).

## Web

`packages/web/src/api/index.ts` gains a `checklists` client object mirroring the
endpoints above.

UI — a new top-level view (the app selects main views via the `ViewBar`
tabs in `App.tsx`, not the sidebar; the sidebar is tag-specific):

- **ViewBar:** add a `"checklists"` entry to `AppView` / `VIEW_IDS` so a
  "Checklists" tab appears next to dashboard / ideas / tasks.
- **ChecklistsView component** (`packages/web/src/components/ChecklistsView.tsx`):
  a master-detail view. With no list selected it shows the list of checklists
  (with item counts) and a "+ new list" input. Selecting a list shows its detail:
  title with a header menu (rename / delete list), rows of `[checkbox] name`, and
  an "add item" input at the bottom.
  - Ticking a checkbox fires `PATCH /api/checklists/:id/items/:itemId { checked }`
    and updates in place. Checked rows stay in position, shown with a checkmark
    (name struck through / dimmed).
  - Each row has a small delete ("×") control.
- An `app.views.checklists` i18n key is added to `en.json` (other locales fall
  back to English).

## Mobile (Expo) — priority

- New tab screen `packages/mobile/app/(tabs)/checklists.tsx`, registered in
  `packages/mobile/app/(tabs)/_layout.tsx` with an appropriate Ionicons icon.
- List screen → tap a list → detail view with checkboxes and an add-item field.
- API helper `packages/mobile/src/api/checklists.ts` using the shared `api` client
  and `@notes-world/shared` types.
- **Deliverable:** after the feature works, rebuild and produce the signed Android
  `.aab` per the documented Android build process (see android build notes).

## MCP

New `packages/mcp/src/tools/checklists.ts`, registered via
`registerChecklistTools(server)` in `packages/mcp/src/index.ts`. Tools:

- `list_checklists` — all lists with counts
- `get_checklist` — one list with items
- `create_checklist` — `{ title }`
- `add_checklist_item` — `{ checklist (id or title), name }`
- `check_checklist_item` — toggle/set `checked` by item id or by `{ checklist, name }`
- `delete_checklist_item`

Enables phrases like "add olive oil to groceries" or "check off milk."

## Error Handling

- Validation errors return the app's standard error format (per `docs/api.md`).
- Missing/foreign list or item → 404, scoped by user (no cross-user enumeration).
- `title` and item `name`: 1–300 chars, trimmed, non-empty.

## Testing

Server domain tests following existing patterns:

- Create list; add item; toggle `checked`; rename; delete item; delete list cascade.
- User-scoping: a user cannot read or modify another user's list or item.
- Validation: empty/oversized title and name rejected.

Per the project's testing rule, any bug found during implementation gets a
regression test. Tests run in CI before deploy.

## Rollout

Work on `master` (no feature branches, per project convention); CI/CD deploys when
tests pass. Migration auto-runs on server startup. Mobile AAB built and produced as
the final step.
