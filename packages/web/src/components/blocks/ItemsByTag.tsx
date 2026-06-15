import { Fragment, ReactNode, useEffect, useMemo, useState } from 'react';
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
    const prev = sortMode;
    setSortMode(mode);
    api.dashboard
      .updateBlock(block.id, { config: { ...block.config, sort_mode: mode } })
      .catch(() => setSortMode(prev));
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
          displayItems.map(item => <Fragment key={item.id}>{row(item)}</Fragment>)
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
