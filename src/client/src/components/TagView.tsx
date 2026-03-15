import { useEffect, useState } from 'react';
import { Tag, Item } from '../types';
import * as api from '../api';
import { useApp } from '../context/AppContext';
import { SortableList } from './SortableList';

interface Props {
  tag: Tag;
}

export function TagView({ tag }: Props) {
  const { openItem, state: { refreshKey } } = useApp();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.tags.getItemsForTag(tag.id)
      .then(setItems)
      .finally(() => setLoading(false));
  }, [tag.id, refreshKey]);

  return (
    <div className="p-4 h-full overflow-y-auto">
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
        {tag.name}
        {!loading && <span className="ml-2 text-gray-600 normal-case font-normal">{items.length} items</span>}
      </h2>

      {loading ? (
        <p className="text-sm text-gray-600 py-8 text-center">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-600 py-8 text-center">No items with this tag</p>
      ) : (
        <SortableList
          items={items}
          contextKey={`tag:${tag.id}`}
          extraDragData={(item) => [
            { type: 'application/x-item-id',    value: item.id },
            { type: 'application/x-from-tag-id', value: tag.id },
          ]}
          className="grid grid-cols-3 gap-2"
          itemClassName=""
          renderItem={(item, dragHandle) => (
            <div className="card hover:border-surface-400 hover:bg-surface-600 transition-colors py-2 px-3 flex items-center gap-2">
              {dragHandle}
              <button
                onClick={() => openItem(item.id)}
                className="flex-1 text-left min-w-0"
              >
                <p className="text-sm text-gray-200">{item.title}</p>
                {item.body && (
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{item.body}</p>
                )}
              </button>
            </div>
          )}
        />
      )}
    </div>
  );
}
