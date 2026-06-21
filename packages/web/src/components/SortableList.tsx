import React, { useEffect, useRef } from 'react';
import { useSortableList, ExtraDragData, DropMode } from '../hooks/useSortableList';

interface HasId { id: string }

interface Props<T extends HasId> {
  items: T[];
  contextKey: string | null;
  renderItem: (item: T, dragHandle: React.ReactNode) => React.ReactNode;
  extraDragData?: (item: T) => ExtraDragData[];
  onReorder?: (orderedItems: T[]) => void;
  onExternalDrop?: (itemId: string, targetId: string) => void;
  // When supplied, internal drags become tree drops (nest "into" / "before")
  // and the caller owns the parent + order changes. Omit it for a flat list.
  onTreeDrop?: (fromId: string, targetId: string, mode: DropMode) => void;
  className?: string;
  itemClassName?: string | ((item: T) => string);
}

function GripHandle({ dragProps }: { dragProps: object }) {
  return (
    <div
      {...dragProps}
      className="cursor-grab active:cursor-grabbing p-1.5 text-gray-600 hover:text-gray-400 shrink-0"
      onClick={e => e.stopPropagation()}
      title="Drag to reorder"
    >
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
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
  onReorder,
  onExternalDrop,
  onTreeDrop,
  className,
  itemClassName,
}: Props<T>) {
  const {
    orderedItems,
    dragHandleProps,
    dropZoneProps,
    dragOverId,
    dropMode,
    dragId,
  } = useSortableList(
    items,
    contextKey,
    extraDragData,
    onExternalDrop,
    onTreeDrop,
  );

  // Notify parent of order changes
  const onReorderRef = useRef(onReorder);
  onReorderRef.current = onReorder;
  const prevOrderRef = useRef<string>('');
  useEffect(() => {
    const key = orderedItems.map(i => i.id).join(',');
    if (key !== prevOrderRef.current) {
      prevOrderRef.current = key;
      onReorderRef.current?.(orderedItems);
    }
  }, [orderedItems]);

  return (
    <div className={className}>
      {orderedItems.map(item => {
        const content = renderItem(item, (
          <GripHandle dragProps={dragHandleProps(item.id)} />
        ));
        return (
          <div
            key={item.id}
            {...dropZoneProps(item.id)}
            className={[
              'transition-all duration-150',
              content == null ? 'hidden' : '',
              dragId === item.id ? 'opacity-40 scale-[0.98]' : '',
              dragOverId === item.id
                ? dropMode === 'into'
                  ? 'ring-2 ring-accent ring-inset rounded-md'
                  : 'border-t-2 border-accent pt-0.5'
                : '',
              typeof itemClassName === 'function' ? itemClassName(item) : (itemClassName ?? ''),
            ].filter(Boolean).join(' ')}
          >
            {content}
          </div>
        );
      })}
    </div>
  );
}
