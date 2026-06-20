# Mobile Collapsible Dividers — Design

**Date:** 2026-06-10
**Status:** Approved

## Goal

Bring the web app's collapsible-divider behavior to the Android (Expo) app. In a
tag view, tapping a divider's chevron hides/shows the items between that divider
and the next one. Collapsed state is **synced with the server** so it matches the
web and follows the user across devices.

## Reference (web behavior)

- `packages/web/src/components/tag-view/DividerRow.tsx` — chevron points right
  (`▸`) when collapsed, rotates to down (`▾`) when expanded; shows `(count)` of
  hidden items when collapsed.
- `packages/web/src/components/TagView.tsx` — holds `collapsedSet: Set<string>`
  of collapsed divider IDs; `toggleCollapse` flips membership and fire-and-forget
  saves; items whose parent divider is collapsed render `null`.
- Persistence reuses the sort-orders endpoint via key `tag:{tagId}:collapsed`
  (`packages/web/src/api/index.ts` → `collapsedDividers`).

## Server contract (unchanged, already deployed)

- `GET /sort-orders?context=tag:{tagId}:collapsed` → `[{ item_id, sort_order }]`
- `PUT /sort-orders` body `{ context_key, item_ids }` → 204

The collapsed divider IDs are stored as the `item_ids` list under that context key.

## Changes (mobile)

1. **`src/api/sortOrders.ts` (new)** — `sortOrders.get(contextKey)` /
   `sortOrders.save(contextKey, ids)` and `collapsedDividers.get(tagId)` /
   `collapsedDividers.save(tagId, ids)`, mirroring web, built on the existing
   `api` client (`src/api/client.ts`).

2. **`src/lib/dividerGrouping.ts` (new, pure)** — extracted, framework-free:
   - `getParentDividerMap(items): Map<itemId, dividerId | null>`
   - `getHiddenCounts(items): Map<dividerId, number>`
     Pure functions so they can be unit-tested in isolation.

3. **`app/tag/[id].tsx`** — add `collapsedSet` state; load via
   `collapsedDividers.get(id)` alongside items; `toggleCollapse(id)` flips the set
   and fire-and-forget saves (errors ignored, web parity); compute the parent map +
   counts; filter the `FlatList` data so items under a collapsed divider are not
   rendered.

4. **`src/components/ItemCard.tsx`** — divider branch gains 3 optional props
   (`collapsed`, `hiddenCount`, `onToggle`). Render an Ionicons chevron
   (`chevron-forward` collapsed → `chevron-down` expanded) on the left of the
   divider row that calls `onToggle`; show `(count)` when collapsed. Non-divider
   cards and existing divider press (→ open item editor) and delete are unchanged.

## Interaction model

- **Chevron tap** → toggle collapse (matches web chevron).
- **Divider row tap** → open the item editor to rename (matches web title-click;
  preserves current mobile behavior).
- **Delete (×)** → unchanged.

## Data flow

Items already load in document order from `getItemsByTag`. Order drives the
parent-divider grouping. Derived maps are recomputed in render from `items` +
`collapsedSet`. Collapse changes never refetch.

## Error handling

- Save: fire-and-forget; failure is ignored (state stays as the user set it
  locally; web does the same).
- Load of collapsed set: on error, default to nothing collapsed (everything shown).

## i18n

Chevron is icon-only; `(count)` is a bare number — no new visible strings. Any
accessibility label added must go into all 25 mobile locales (project rule).

## Testing

Unit tests (vitest) for `dividerGrouping`:

- Items before the first divider map to `null` parent and are always visible.
- Items between divider A and divider B map to A.
- `getHiddenCounts` counts only non-divider items per divider.
- A collapsed divider's children are identifiable as hidden via the parent map.
