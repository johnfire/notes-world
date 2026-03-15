import { useState, useEffect, useRef, useCallback } from 'react';
import * as api from '../api';

interface HasId { id: string }

export interface ExtraDragData {
  type: string;
  value: string;
}

interface UseSortableListResult<T extends HasId> {
  orderedItems: T[];
  dragHandleProps: (id: string) => {
    draggable: true;
    onDragStart: (e: React.DragEvent) => void;
    onDragEnd:   (e: React.DragEvent) => void;
  };
  dropZoneProps: (id: string) => {
    onDragOver:  (e: React.DragEvent) => void;
    onDragLeave: (e: React.DragEvent) => void;
    onDrop:      (e: React.DragEvent) => void;
  };
  dragOverId: string | null;
  dragId:     string | null;
}

export function useSortableList<T extends HasId>(
  items: T[],
  contextKey: string | null,
  extraDragData?: (item: T) => ExtraDragData[]
): UseSortableListResult<T> {
  const [orderedItems, setOrderedItems] = useState<T[]>(items);
  const [dragId,     setDragId]     = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const dragIdRef  = useRef<string | null>(null);
  const saveTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDragging = useRef(false);

  // Stable key: sorted IDs joined — only changes when items are added/removed
  const itemsKey = items.map(i => i.id).slice().sort().join(',');

  useEffect(() => {
    // Don't reset order while user is mid-drag
    if (isDragging.current) return;

    if (!contextKey || items.length === 0) {
      setOrderedItems(items);
      return;
    }
    api.sortOrders.get(contextKey).then(rows => {
      if (rows.length === 0) {
        setOrderedItems(items);
        return;
      }
      const orderMap = new Map(rows.map(r => [r.item_id, r.sort_order]));
      const sorted = [...items].sort((a, b) => {
        const oa = orderMap.has(a.id) ? orderMap.get(a.id)! : Infinity;
        const ob = orderMap.has(b.id) ? orderMap.get(b.id)! : Infinity;
        return oa - ob;
      });
      setOrderedItems(sorted);
    }).catch(() => setOrderedItems(items));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsKey, contextKey]);

  const saveOrder = useCallback((newOrder: T[]) => {
    if (!contextKey) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      api.sortOrders.save(contextKey, newOrder.map(i => i.id)).catch(console.error);
    }, 100);
  }, [contextKey]);

  function handleDragStart(e: React.DragEvent, item: T) {
    isDragging.current = true;
    dragIdRef.current = item.id;
    setDragId(item.id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', item.id);
    // Set any extra data the caller needs (e.g. for tag-drop on sidebar)
    if (extraDragData) {
      for (const { type, value } of extraDragData(item)) {
        e.dataTransfer.setData(type, value);
      }
    }
  }

  function handleDragEnd(_e: React.DragEvent) {
    isDragging.current = false;
    dragIdRef.current = null;
    setDragId(null);
    setDragOverId(null);
  }

  function handleDragOver(e: React.DragEvent, targetId: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragIdRef.current && dragIdRef.current !== targetId) {
      setDragOverId(targetId);
    }
  }

  function handleDragLeave(e: React.DragEvent, targetId: string) {
    const related = e.relatedTarget as Node | null;
    if (!related || !(e.currentTarget as Node).contains(related)) {
      setDragOverId(prev => prev === targetId ? null : prev);
    }
  }

  function handleDrop(e: React.DragEvent, targetId: string) {
    e.preventDefault();
    setDragOverId(null);
    const fromId = e.dataTransfer.getData('text/plain') || dragIdRef.current;
    if (!fromId || fromId === targetId) return;

    setOrderedItems(prev => {
      const next = [...prev];
      const fromIdx = next.findIndex(i => i.id === fromId);
      const toIdx   = next.findIndex(i => i.id === targetId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      saveOrder(next);
      return next;
    });

    dragIdRef.current = null;
    setDragId(null);
  }

  return {
    orderedItems,
    dragHandleProps: (id: string, item?: T) => ({
      draggable: true,
      onDragStart: (e: React.DragEvent) => handleDragStart(e, (item ?? orderedItems.find(i => i.id === id))!),
      onDragEnd:   (e: React.DragEvent) => handleDragEnd(e),
    }),
    dropZoneProps: (id: string) => ({
      onDragOver:  (e: React.DragEvent) => handleDragOver(e, id),
      onDragLeave: (e: React.DragEvent) => handleDragLeave(e, id),
      onDrop:      (e: React.DragEvent) => handleDrop(e, id),
    }),
    dragOverId,
    dragId,
  };
}
