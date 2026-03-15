import React from 'react';
import { useSortableList, ExtraDragData } from '../hooks/useSortableList';

interface HasId { id: string }

interface Props<T extends HasId> {
  items: T[];
  contextKey: string | null;
  renderItem: (item: T, dragHandle: React.ReactNode) => React.ReactNode;
  extraDragData?: (item: T) => ExtraDragData[];
  className?: string;
  itemClassName?: string | ((item: T) => string);
}

function GripHandle({ dragProps }: { dragProps: object }) {
  return (
    <div
      {...dragProps}
      className="cursor-grab active:cursor-grabbing p-1 text-gray-600 hover:text-gray-400 shrink-0"
      onClick={e => e.stopPropagation()}
      title="Drag to reorder"
    >
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="9"  cy="5"  r="1.5" />
        <circle cx="15" cy="5"  r="1.5" />
        <circle cx="9"  cy="12" r="1.5" />
        <circle cx="15" cy="12" r="1.5" />
        <circle cx="9"  cy="19" r="1.5" />
        <circle cx="15" cy="19" r="1.5" />
      </svg>
    </div>
  );
}

export function SortableList<T extends HasId>({
  items,
  contextKey,
  renderItem,
  extraDragData,
  className,
  itemClassName,
}: Props<T>) {
  const { orderedItems, dragHandleProps, dropZoneProps, dragOverId, dragId } =
    useSortableList(items, contextKey, extraDragData);

  return (
    <div className={className}>
      {orderedItems.map(item => (
        <div
          key={item.id}
          {...dropZoneProps(item.id)}
          className={[
            'transition-all duration-150',
            dragId === item.id ? 'opacity-40 scale-[0.98]' : '',
            dragOverId === item.id ? 'border-t-2 border-accent pt-0.5' : '',
            typeof itemClassName === 'function' ? itemClassName(item) : (itemClassName ?? ''),
          ].filter(Boolean).join(' ')}
        >
          {renderItem(item, (
            <GripHandle dragProps={dragHandleProps(item.id)} />
          ))}
        </div>
      ))}
    </div>
  );
}
