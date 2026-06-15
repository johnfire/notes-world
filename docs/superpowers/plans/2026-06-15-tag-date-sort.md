# Tag Date Display + Date-Sort Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a task's due date in `ItemsByTag` rows and let each block toggle between Manual (drag) and By-date ordering, persisted per block.

**Architecture:** No server/DB change. `due_date` already lives in `type_data`. Sorting is done client-side on already-fetched items. The toggle persists through the existing `api.dashboard.updateBlock(blockId, { config })`. A new `sort_mode` field on `BlockConfig` carries the choice. Pure helpers (`formatDueShort`, `sortItemsByDue`) are unit-tested; the component wires them in.

**Tech Stack:** TypeScript, React 18, Vitest + @testing-library/react, Tailwind. All work in `packages/shared` and `packages/web`.

---

## File Structure

- `packages/shared/src/types/index.ts` — add `sort_mode` to `BlockConfig` (web re-exports shared, so the type flows automatically).
- `packages/web/src/components/blocks/itemsByTag.utils.ts` — **create**: pure `formatDueShort` + `sortItemsByDue`.
- `packages/web/src/components/blocks/itemsByTag.utils.test.ts` — **create**: unit tests for the helpers.
- `packages/web/src/components/blocks/ItemsByTag.tsx` — **modify**: header toggle, date in rows, static-vs-sortable list switch.

---

## Task 1: Add `sort_mode` to BlockConfig

**Files:**
- Modify: `packages/shared/src/types/index.ts:151-158` (the `BlockConfig` interface)

- [ ] **Step 1: Add the field**

In `packages/shared/src/types/index.ts`, find the `BlockConfig` interface:

```ts
export interface BlockConfig {
  tag_id?: TagId;
  filter_tag_id?: TagId;
  group_by_maturity?: boolean;
  limit?: number;
  root_item_id?: ItemId;
  depth?: number;
}
```

Add one line so it becomes:

```ts
export interface BlockConfig {
  tag_id?: TagId;
  filter_tag_id?: TagId;
  group_by_maturity?: boolean;
  limit?: number;
  root_item_id?: ItemId;
  depth?: number;
  sort_mode?: "manual" | "due_date";
}
```

- [ ] **Step 2: Typecheck shared**

Run: `npm run build --workspace=packages/shared`
Expected: builds with no type errors.

- [ ] **Step 3: Commit**

```bash
git add packages/shared/src/types/index.ts
git commit -m "feat(shared): add sort_mode to BlockConfig"
```

---

## Task 2: Pure helpers — `formatDueShort` and `sortItemsByDue`

**Files:**
- Create: `packages/web/src/components/blocks/itemsByTag.utils.ts`
- Test: `packages/web/src/components/blocks/itemsByTag.utils.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `packages/web/src/components/blocks/itemsByTag.utils.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { ItemType, ItemStatus, type Item } from '../../types';
import { formatDueShort, sortItemsByDue } from './itemsByTag.utils';

function task(id: string, title: string, due?: string): Item {
  return {
    id,
    user_id: 'u1',
    title,
    item_type: ItemType.Task,
    status: ItemStatus.Active,
    type_data: due ? { due_date: due } : undefined,
    created_at: '',
    updated_at: '',
  } as Item;
}

describe('formatDueShort', () => {
  it('shows month and day for the current year', () => {
    const now = new Date();
    const d = new Date(now.getFullYear(), 5, 18); // Jun 18
    expect(formatDueShort(d.toISOString())).toBe('Jun 18');
  });

  it('appends a 2-digit year when the year differs from now', () => {
    const otherYear = new Date().getFullYear() + 1;
    const d = new Date(otherYear, 5, 18);
    expect(formatDueShort(d.toISOString())).toBe(`Jun 18 '${String(otherYear).slice(-2)}`);
  });

  it('returns empty string for an invalid date', () => {
    expect(formatDueShort('not-a-date')).toBe('');
  });
});

describe('sortItemsByDue', () => {
  it('orders dated tasks ascending, undated last', () => {
    const items = [
      task('a', 'Alpha'),                         // undated
      task('c', 'Charlie', '2026-03-01T00:00:00Z'),
      task('b', 'Bravo',   '2026-01-01T00:00:00Z'),
    ];
    expect(sortItemsByDue(items).map(i => i.id)).toEqual(['b', 'c', 'a']);
  });

  it('tie-breaks equal dates by title', () => {
    const items = [
      task('z', 'Zebra', '2026-01-01T00:00:00Z'),
      task('m', 'Mango', '2026-01-01T00:00:00Z'),
    ];
    expect(sortItemsByDue(items).map(i => i.id)).toEqual(['m', 'z']);
  });

  it('treats an invalid due_date as undated', () => {
    const items = [
      task('bad', 'Bad', 'not-a-date'),
      task('good', 'Good', '2026-01-01T00:00:00Z'),
    ];
    expect(sortItemsByDue(items).map(i => i.id)).toEqual(['good', 'bad']);
  });

  it('does not mutate the input array', () => {
    const items = [task('a', 'A', '2026-02-01T00:00:00Z'), task('b', 'B', '2026-01-01T00:00:00Z')];
    const before = items.map(i => i.id);
    sortItemsByDue(items);
    expect(items.map(i => i.id)).toEqual(before);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test --workspace=packages/web -- itemsByTag.utils`
Expected: FAIL — `itemsByTag.utils` module not found / `formatDueShort` undefined.

- [ ] **Step 3: Write the implementation**

Create `packages/web/src/components/blocks/itemsByTag.utils.ts`:

```ts
import { Item } from '../../types';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Compact absolute due date: "Jun 18", or "Jun 18 '27" when the year differs from now. */
export function formatDueShort(dueDate: string): string {
  const d = new Date(dueDate);
  if (Number.isNaN(d.getTime())) return '';
  const base = `${MONTHS[d.getMonth()]} ${d.getDate()}`;
  return d.getFullYear() === new Date().getFullYear()
    ? base
    : `${base} '${String(d.getFullYear()).slice(-2)}`;
}

function dueTime(item: Item): number | null {
  const td = item.type_data as { due_date?: string } | null;
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test --workspace=packages/web -- itemsByTag.utils`
Expected: PASS — all tests in `itemsByTag.utils.test.ts` green.

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/components/blocks/itemsByTag.utils.ts packages/web/src/components/blocks/itemsByTag.utils.test.ts
git commit -m "feat(web): add formatDueShort and sortItemsByDue helpers"
```

---

## Task 3: Wire toggle + date display into ItemsByTag

**Files:**
- Modify: `packages/web/src/components/blocks/ItemsByTag.tsx` (full rewrite of the component body)

- [ ] **Step 1: Replace the component**

Replace the entire contents of `packages/web/src/components/blocks/ItemsByTag.tsx` with:

```tsx
import { ReactNode, useEffect, useMemo, useState } from 'react';
import { Block, Item } from '../../types';
import * as api from '../../api';
import { useApp } from '../../context/AppContext';
import { SortableList } from '../SortableList';
import { formatDueShort, sortItemsByDue } from './itemsByTag.utils';

interface Props { block: Block }

type SortMode = 'manual' | 'due_date';

export function ItemsByTag({ block }: Props) {
  const { openItem, state: { refreshKey } } = useApp();
  const tagId = block.config?.tag_id;
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>(
    block.config?.sort_mode === 'due_date' ? 'due_date' : 'manual',
  );

  useEffect(() => {
    if (!tagId) return;
    setLoading(true);
    api.tags.getItemsForTag(tagId)
      .then(setItems)
      .finally(() => setLoading(false));
  }, [tagId, refreshKey]);

  const displayItems = useMemo(
    () => (sortMode === 'due_date' ? sortItemsByDue(items) : items),
    [items, sortMode],
  );

  function changeSort(mode: SortMode) {
    if (mode === sortMode) return;
    setSortMode(mode);
    api.dashboard
      .updateBlock(block.id, { config: { ...block.config, sort_mode: mode } })
      .catch(() => {});
  }

  function dueOf(item: Item): string | undefined {
    const td = item.type_data as { due_date?: string } | null;
    return td?.due_date || undefined;
  }

  function row(item: Item, dragHandle?: ReactNode) {
    const due = dueOf(item);
    return (
      <div className="flex items-center gap-1 py-2 border-b border-surface-500 last:border-0">
        {dragHandle}
        <button onClick={() => openItem(item.id)} className="flex-1 text-left min-w-0">
          <p className="text-sm text-gray-200 truncate">{item.title}</p>
        </button>
        {due && (
          <span className="text-xs text-gray-500 shrink-0 tabular-nums">
            {formatDueShort(due)}
          </span>
        )}
      </div>
    );
  }

  if (!tagId) {
    return (
      <div className="card h-full flex items-center justify-center">
        <p className="text-sm text-gray-600">No tag configured for this block</p>
      </div>
    );
  }

  return (
    <div className="card h-full overflow-hidden flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          {block.title ?? 'Items by Tag'}
        </h3>
        <div className="flex rounded overflow-hidden border border-surface-500 text-[10px]">
          <button
            onClick={() => changeSort('manual')}
            className={`px-2 py-0.5 ${sortMode === 'manual' ? 'bg-surface-500 text-gray-200' : 'text-gray-500'}`}
          >
            Manual
          </button>
          <button
            onClick={() => changeSort('due_date')}
            className={`px-2 py-0.5 ${sortMode === 'due_date' ? 'bg-surface-500 text-gray-200' : 'text-gray-500'}`}
          >
            Date
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <p className="text-sm text-gray-600 py-4 text-center">Loading…</p>
        ) : displayItems.length === 0 ? (
          <p className="text-sm text-gray-600 py-4 text-center">No items with this tag</p>
        ) : sortMode === 'due_date' ? (
          <div>
            {displayItems.map(item => (
              <div key={item.id}>{row(item)}</div>
            ))}
          </div>
        ) : (
          <SortableList
            items={displayItems}
            contextKey={`tag:${tagId}`}
            extraDragData={(item) => [
              { type: 'application/x-item-id',    value: item.id },
              { type: 'application/x-from-tag-id', value: tagId },
            ]}
            renderItem={(item, dragHandle) => row(item, dragHandle)}
          />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck + run the web test suite**

Run: `npm test --workspace=packages/web`
Expected: PASS — existing suite plus the new helper tests stay green.

- [ ] **Step 3: Build the web package to confirm no type errors**

Run: `npm run build --workspace=packages/web`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/components/blocks/ItemsByTag.tsx
git commit -m "feat(web): date display and Manual/Date sort toggle on tag blocks"
```

---

## Task 4: Manual verification

- [ ] **Step 1: Run the app**

Run: `npm run dev`
Open the dashboard with the `0-startup-plan` Items-by-Tag block.

- [ ] **Step 2: Verify behavior**

- Each task with a due date shows a compact date (e.g. `Jun 18`) on the right.
- Clicking **Date** reorders the 21 tasks earliest → latest; undated items drop to the bottom; drag handles disappear.
- Clicking **Manual** restores the drag order and handles.
- Reload the page: the block reopens in the last-chosen mode (persisted via `updateBlock`).

---

## Self-Review Notes

- **Spec coverage:** date in rows (Task 3 `row`), persistent toggle (Task 1 field + Task 3 `changeSort`), client-side date sort with undated-last + title tie-break (Task 2 `sortItemsByDue`), static list in date mode / `SortableList` in manual (Task 3). Web-only, no server/migration — matches non-goals.
- **Type consistency:** `sort_mode: "manual" | "due_date"` is identical in the shared type, the `SortMode` alias, and the persisted config. Helper names `formatDueShort` / `sortItemsByDue` match between Task 2 and Task 3.
- **No placeholders:** every code step is complete.
