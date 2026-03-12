import { useEffect, useState } from 'react';
import { Block, Item, ItemType, TaskStatus } from '../../types';
import * as api from '../../api';
import { useApp } from '../../context/AppContext';

interface Props { block: Block }

export function OverdueTasks({ block }: Props) {
  const { openItem, state: { refreshKey } } = useApp();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.items.byType(ItemType.Task)
      .then((all) =>
        setItems(
          all.filter((item) => {
            const td = item.type_data as { due_date?: string; task_status?: string } | null;
            if (!td?.due_date) return false;
            if (td.task_status === TaskStatus.Done) return false;
            return new Date(td.due_date) < new Date();
          })
        )
      )
      .finally(() => setLoading(false));
  }, [refreshKey]);

  function formatDue(dueDate: string): string {
    const d = new Date(dueDate);
    const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
    if (days === 0) return 'today';
    if (days === 1) return 'yesterday';
    return `${days}d ago`;
  }

  return (
    <div className="card h-full overflow-hidden flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          {block.title ?? 'Overdue'}
        </h3>
        {items.length > 0 && (
          <span className="badge bg-orange-900/40 text-orange-400">{items.length}</span>
        )}
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <p className="text-sm text-gray-600 py-4 text-center">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-gray-600 py-4 text-center">No overdue tasks</p>
        ) : (
          items.map((item) => {
            const td = item.type_data as { due_date?: string } | null;
            return (
              <button key={item.id} onClick={() => openItem(item.id)} className="w-full text-left flex items-start gap-2 py-2 border-b border-surface-500 last:border-0">
                <svg className="w-3.5 h-3.5 mt-0.5 text-warning shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-300 truncate">{item.title}</p>
                  {td?.due_date && (
                    <p className="text-xs text-warning">{formatDue(td.due_date)}</p>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
