import { useEffect, useState } from 'react';
import { Block, Item, ItemType } from '../../types';
import * as api from '../../api';
import { useApp } from '../../context/AppContext';
import { linkify } from '../../utils/linkify';

interface Props { block: Block }

export function Notes({ block }: Props) {
  const { openItem, state: { refreshKey } } = useApp();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const filterTagId = block.config?.filter_tag_id;
    const fetch = filterTagId
      ? api.tags.getItemsForTag(filterTagId)
      : api.items.byType(ItemType.Note);
    fetch.then(setItems).finally(() => setLoading(false));
  }, [block.config?.filter_tag_id, refreshKey]);

  return (
    <div className="card h-full overflow-hidden flex flex-col">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
        {block.title ?? 'Notes'}
      </h3>
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <p className="text-sm text-gray-600 py-4 text-center">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-gray-600 py-4 text-center">No notes yet</p>
        ) : (
          items.map((item) => (
            <button key={item.id} onClick={() => openItem(item.id)} className="w-full text-left py-2 border-b border-surface-500 last:border-0">
              <p className="text-sm text-gray-200">{item.title}</p>
              {item.body && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{linkify(item.body)}</p>}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
