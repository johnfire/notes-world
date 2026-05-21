import { useEffect, useState, useCallback } from 'react';
import { Item, ItemType, TaskStatus } from '../types';
import * as api from '../api';
import { useApp } from '../context/AppContext';
import { relativeAge, stalenessColor } from '../utils/time';

type TStatus = 'Open' | 'InProgress' | 'Blocked' | 'Done';

const COLUMNS: { id: TStatus; label: string }[] = [
  { id: 'Open',       label: 'Open'       },
  { id: 'InProgress', label: 'In Progress' },
  { id: 'Blocked',    label: 'Blocked'    },
  { id: 'Done',       label: 'Done'       },
];

function getStatus(item: Item): TStatus {
  const td = item.type_data as { task_status?: string } | null;
  const s = td?.task_status;
  if (s === 'Open' || s === 'InProgress' || s === 'Blocked' || s === 'Done') return s;
  return 'Open';
}

export function TasksView() {
  const { openItem } = useApp();
  const [items, setItems]           = useState<Item[]>([]);
  const [dragId, setDragId]         = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<TStatus | null>(null);

  const load = useCallback(async () => {
    const all = await api.items.byType(ItemType.Task, 200);
    setItems(all);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function setTaskStatus(item: Item, status: TStatus) {
    const td = (item.type_data as Record<string, unknown> | null) ?? {};
    const patch = { ...td, task_status: status } as Item['type_data'];
    if (status === TaskStatus.Done && !(td as Record<string, unknown>).completed_at) {
      (patch as Record<string, unknown>).completed_at = new Date().toISOString();
    }
    await api.items.update(item.id, { type_data: patch });
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, type_data: patch } : i));
  }

  function move(item: Item, direction: -1 | 1) {
    const idx = COLUMNS.findIndex(c => c.id === getStatus(item));
    const next = COLUMNS[idx + direction];
    if (next) void setTaskStatus(item, next.id);
  }

  function handleDragStart(e: React.DragEvent, itemId: string) {
    setDragId(itemId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', itemId);
  }

  function handleDragOver(e: React.DragEvent, col: TStatus) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTarget(col);
  }

  function handleDrop(e: React.DragEvent, col: TStatus) {
    e.preventDefault();
    setDropTarget(null);
    if (!dragId) return;
    const item = items.find(i => i.id === dragId);
    if (item && getStatus(item) !== col) void setTaskStatus(item, col);
    setDragId(null);
  }

  const STATUS_COLOR: Record<TStatus, string> = {
    Open:       'text-gray-400',
    InProgress: 'text-blue-400',
    Blocked:    'text-red-400',
    Done:       'text-green-400',
  };

  const grouped: Record<TStatus, Item[]> = { Open: [], InProgress: [], Blocked: [], Done: [] };
  for (const item of items) grouped[getStatus(item)].push(item);

  return (
    <div className="flex gap-3 p-4 h-full overflow-x-auto">
      {COLUMNS.map(({ id, label }) => (
        <div
          key={id}
          onDragOver={(e) => handleDragOver(e, id)}
          onDragLeave={() => setDropTarget(null)}
          onDrop={(e) => handleDrop(e, id)}
          className={`flex flex-col w-64 shrink-0 rounded-lg border transition-colors ${
            dropTarget === id
              ? 'border-accent bg-accent/5'
              : 'border-surface-500 bg-surface-800'
          }`}
        >
          {/* Column header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-surface-600">
            <span className={`text-xs font-semibold uppercase tracking-wider ${STATUS_COLOR[id]}`}>
              {label}
            </span>
            <span className="text-xs text-gray-500">{grouped[id].length}</span>
          </div>

          {/* Cards */}
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {grouped[id].map(item => {
              const colIdx = COLUMNS.findIndex(c => c.id === id);
              const td = item.type_data as { priority?: string } | null;
              return (
                <div
                  key={item.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, item.id)}
                  onDragEnd={() => setDragId(null)}
                  className={`group bg-surface-700 border rounded-md px-3 py-2 cursor-grab transition-opacity ${
                    dragId === item.id ? 'opacity-40' : ''
                  } border-surface-500 hover:border-surface-400`}
                >
                  <button
                    onClick={() => openItem(item.id)}
                    className="w-full text-left"
                  >
                    <p className="text-sm text-gray-200 leading-snug">{item.title}</p>
                    {item.body && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.body}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      {td?.priority && td.priority !== 'Normal' && (
                        <span className="text-xs text-amber-400">{td.priority}</span>
                      )}
                      <span className={`text-xs ${stalenessColor(item.updated_at)}`}>
                        {relativeAge(item.updated_at)}
                      </span>
                    </div>
                  </button>
                  {/* Arrow controls */}
                  <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => move(item, -1)}
                      disabled={colIdx === 0}
                      className="text-gray-500 hover:text-gray-200 disabled:opacity-20 disabled:cursor-not-allowed p-0.5"
                      title="Move left"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => move(item, 1)}
                      disabled={colIdx === COLUMNS.length - 1}
                      className="text-gray-500 hover:text-gray-200 disabled:opacity-20 disabled:cursor-not-allowed p-0.5"
                      title="Move right"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}

            {grouped[id].length === 0 && (
              <p className="text-xs text-gray-600 text-center py-4">No tasks here</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
