import { useEffect, useState } from 'react';
import { Block, Item, ItemType, TaskStatus } from '../../types';
import * as api from '../../api';

interface Props { block: Block }

export function BlockedTasks({ block }: Props) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.items.byType(ItemType.Task)
      .then((all) =>
        setItems(
          all.filter((item) => {
            const td = item.type_data as { task_status?: string } | null;
            return td?.task_status === TaskStatus.Blocked;
          })
        )
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="card h-full overflow-hidden flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          {block.title ?? 'Blocked'}
        </h3>
        {items.length > 0 && (
          <span className="badge bg-red-900/40 text-red-400">{items.length}</span>
        )}
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <p className="text-sm text-gray-600 py-4 text-center">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-gray-600 py-4 text-center">No blocked tasks</p>
        ) : (
          items.map((item) => (
            <div key={item.id} className="flex items-start gap-2 py-2 border-b border-surface-500 last:border-0">
              <svg className="w-3.5 h-3.5 mt-0.5 text-danger shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-gray-300 truncate">{item.title}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
