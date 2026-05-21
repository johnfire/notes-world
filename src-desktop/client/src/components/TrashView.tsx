import { useEffect, useState } from 'react';
import { Item } from '../types';
import * as api from '../api';

export function TrashView() {
  const [items,   setItems]   = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.items.trash()
      .then(setItems)
      .finally(() => setLoading(false));
  }, []);

  async function handleRestore(id: string) {
    await api.items.restore(id);
    setItems(prev => prev.filter(i => i.id !== id));
  }

  async function handlePurge(id: string) {
    await api.items.purge(id);
    setItems(prev => prev.filter(i => i.id !== id));
  }

  function daysLeft(item: Item): number {
    if (!item.archived_at) return 30;
    const archived = new Date(item.archived_at).getTime();
    const now = Date.now();
    const elapsed = Math.floor((now - archived) / (1000 * 60 * 60 * 24));
    return Math.max(0, 30 - elapsed);
  }

  return (
    <div className="p-4 h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Trash
          {!loading && <span className="ml-2 text-gray-600 normal-case font-normal">{items.length} items</span>}
        </h2>
      </div>

      {loading ? (
        <p className="text-sm text-gray-600 py-8 text-center">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-600 py-8 text-center">Trash is empty</p>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map(item => (
            <div
              key={item.id}
              className="card py-2 px-3 flex items-center gap-2 opacity-60 hover:opacity-100 transition-opacity group"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-300">{item.title}</p>
                {item.body && (
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{item.body}</p>
                )}
                <p className="text-xs text-gray-600 mt-1">{daysLeft(item)} days until permanent deletion</p>
              </div>
              <button
                onClick={() => handleRestore(item.id)}
                className="text-xs text-gray-500 hover:text-green-400 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                title="Restore item"
              >
                Restore
              </button>
              <button
                onClick={() => handlePurge(item.id)}
                className="text-xs text-gray-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                title="Delete permanently"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
