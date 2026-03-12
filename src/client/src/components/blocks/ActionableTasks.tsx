import { useEffect, useState } from 'react';
import { Block, Item, ItemType, TaskStatus, Priority } from '../../types';
import * as api from '../../api';
import { useApp } from '../../context/AppContext';

interface Props { block: Block }

function priorityColor(priority: string): string {
  switch (priority) {
    case Priority.Critical: return 'text-red-400';
    case Priority.High:     return 'text-orange-400';
    case Priority.Normal:   return 'text-blue-400';
    default:                return 'text-gray-500';
  }
}

export function ActionableTasks({ block }: Props) {
  const { openItem } = useApp();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.items.byType(ItemType.Task)
      .then((all) =>
        setItems(
          all.filter((item) => {
            const td = item.type_data as { task_status?: string } | null;
            return td?.task_status === TaskStatus.Open || td?.task_status === TaskStatus.InProgress;
          })
        )
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="card h-full overflow-hidden flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          {block.title ?? 'Actionable Tasks'}
        </h3>
        <span className="text-xs text-gray-600">{items.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <p className="text-sm text-gray-600 py-4 text-center">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-gray-600 py-4 text-center">No actionable tasks</p>
        ) : (
          items.map((item) => {
            const td = item.type_data as { task_status?: string; priority?: string } | null;
            return (
              <button key={item.id} onClick={() => openItem(item.id)} className="w-full text-left flex items-start gap-2 py-2 border-b border-surface-500 last:border-0">
                <div className={`mt-0.5 shrink-0 ${priorityColor(td?.priority ?? 'Normal')}`}>
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="4" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-200 truncate">{item.title}</p>
                  {td?.task_status === TaskStatus.InProgress && (
                    <span className="text-xs text-accent">In Progress</span>
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
