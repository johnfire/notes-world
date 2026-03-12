import { useEffect, useState } from 'react';
import { Block, Item } from '../../types';
import * as api from '../../api';
import { useApp } from '../../context/AppContext';

interface Props { block: Block }

export function ItemsByTag({ block }: Props) {
  const { openItem } = useApp();
  const tagId = block.config?.tag_id;
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!tagId) return;
    setLoading(true);
    api.tags.getItemsForTag(tagId)
      .then(setItems)
      .finally(() => setLoading(false));
  }, [tagId]);

  if (!tagId) {
    return (
      <div className="card h-full flex items-center justify-center">
        <p className="text-sm text-gray-600">No tag configured for this block</p>
      </div>
    );
  }

  return (
    <div className="card h-full overflow-hidden flex flex-col">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
        {block.title ?? 'Items by Tag'}
      </h3>
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <p className="text-sm text-gray-600 py-4 text-center">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-gray-600 py-4 text-center">No items with this tag</p>
        ) : (
          items.map((item) => (
            <button key={item.id} onClick={() => openItem(item.id)} className="w-full text-left py-2 border-b border-surface-500 last:border-0">
              <p className="text-sm text-gray-200 truncate">{item.title}</p>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
