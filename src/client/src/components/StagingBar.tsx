import React from 'react';
import { useApp } from '../context/AppContext';

export function StagingBar() {
  const { state: { unsortedItems }, openItem, removeUnsorted } = useApp();

  if (unsortedItems.length === 0) return null;

  function handleDragStart(e: React.DragEvent, itemId: string) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', itemId);
    e.dataTransfer.setData('application/x-item-id', itemId);
    e.dataTransfer.setData('application/x-from-staging', '1');
  }

  return (
    <div className="shrink-0 border-t border-surface-500 bg-surface-800 px-4 py-2">
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1.5">
        Unsorted ({unsortedItems.length})
      </p>
      <div className="flex flex-wrap gap-2">
        {unsortedItems.map(item => (
          <div
            key={item.id}
            draggable
            onDragStart={e => handleDragStart(e, item.id)}
            className="flex items-center gap-1.5 bg-surface-600 border border-surface-400 rounded-md px-2.5 py-1.5 text-sm text-gray-200 cursor-grab active:cursor-grabbing hover:border-accent transition-colors max-w-xs"
          >
            <button
              onClick={() => openItem(item.id)}
              className="truncate text-left"
            >
              {item.title}
            </button>
            <button
              onClick={() => removeUnsorted(item.id)}
              className="text-gray-600 hover:text-gray-400 shrink-0 text-xs ml-1"
              title="Dismiss"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
