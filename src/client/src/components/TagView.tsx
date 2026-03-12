import { useEffect, useState } from 'react';
import { Tag, Item } from '../types';
import * as api from '../api';
import { useApp } from '../context/AppContext';

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

  function handleDragStart(e: React.DragEvent, itemId: string) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/x-item-id', itemId);
    e.dataTransfer.setData('application/x-from-tag-id', tag.id);
  }

  return (
    <div className="p-4 max-w-2xl">
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
        {tag.name}
        {!loading && <span className="ml-2 text-gray-600 normal-case font-normal">{items.length} items</span>}
      </h2>

      {loading ? (
        <p className="text-sm text-gray-600 py-8 text-center">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-600 py-8 text-center">No items with this tag</p>
      ) : (
        <div className="space-y-1">
          {items.map((item) => (
            <div
              key={item.id}
              draggable
              onDragStart={(e) => handleDragStart(e, item.id)}
              className="cursor-grab active:cursor-grabbing"
            >
              <button
                onClick={() => openItem(item.id)}
                className="w-full text-left card hover:border-surface-400 hover:bg-surface-600 transition-colors py-2 px-3"
              >
                <p className="text-sm text-gray-200">{item.title}</p>
                {item.body && (
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{item.body}</p>
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
