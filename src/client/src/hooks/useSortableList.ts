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

// Each list instance gets a unique drag-source key so drops from one list
// are not mistakenly handled by another list on the same page.
let instanceCounter = 0;

export function useSortableList<T extends HasId>(
  items: T[],
  contextKey: string | null,
  extraDragData?: (item: T) => ExtraDragData[]
): UseSortableListResult<T> {
  // Store only the ordered IDs — item data is always looked up fresh from items prop.
  // This means data changes (label edits) never interfere with drag order.
  const [orderedIds, setOrderedIds] = useState<string[]>(items.map(i => i.id));
  const [dragId,     setDragId]     = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const dragIdRef      = useRef<string | null>(null);
  const saveTimer      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDragging     = useRef(false);
  const dropFiredRef   = useRef(false);
  const lastDropTime   = useRef<number>(0);
  // Unique key for this list instance — written to dataTransfer so we can
  // reject drops that originated from a different list.
  const instanceKey    = useRef(`sortable-${++instanceCounter}`);
  const dragTypeKey    = `application/x-sortable-source`;

  // Stable key: sorted IDs — only changes when items are added/removed
  const itemsKey = items.map(i => i.id).slice().sort().join(',');

  useEffect(() => {
    console.log('[sort effect] fired, isDragging=', isDragging.current, 'itemsKey=', itemsKey);
    if (isDragging.current) return;

    if (!contextKey || items.length === 0) {
      setOrderedIds(items.map(i => i.id));
      return;
    }

    let cancelled = false;
    const effectStartTime = Date.now();
    api.sortOrders.get(contextKey).then(rows => {
      // Skip if cancelled, currently dragging, or a drop happened after this
      // effect started (meaning the server data we fetched is already stale).
      if (cancelled || isDragging.current || lastDropTime.current > effectStartTime) {
        console.log('[sort effect] skipping setOrderedIds — cancelled/dragging/stale');
        return;
      }
      const allIds = items.map(i => i.id);
      console.log('[sort effect] got rows', rows.length, 'allIds', allIds);
      if (rows.length === 0) {
        setOrderedIds(allIds);
        return;
      }
      const orderMap = new Map(rows.map(r => [r.item_id, r.sort_order]));
      const sorted = [...allIds].sort((a, b) => {
        const oa = orderMap.has(a) ? orderMap.get(a)! : Infinity;
        const ob = orderMap.has(b) ? orderMap.get(b)! : Infinity;
        return oa - ob;
      });
      console.log('[sort effect] sorted result', sorted);
      setOrderedIds(sorted);
    }).catch(() => {
      if (!cancelled && !isDragging.current) setOrderedIds(items.map(i => i.id));
    });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsKey, contextKey]);

  // Derive ordered items by looking up each ID in the current items prop.
  // Any IDs not found (stale) are dropped; any new IDs not yet in orderedIds
  // are appended at the end.
  const itemMap = new Map(items.map(i => [i.id, i]));
  const knownIds = new Set(orderedIds);
  const newIds = items.map(i => i.id).filter(id => !knownIds.has(id));
  const allOrderedIds = newIds.length > 0 ? [...orderedIds, ...newIds] : orderedIds;
  const orderedItems = allOrderedIds.map(id => itemMap.get(id)).filter((i): i is T => i !== undefined);

  const saveOrder = useCallback((newIds: string[]) => {
    if (!contextKey) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      api.sortOrders.save(contextKey, newIds).catch(console.error);
    }, 100);
  }, [contextKey]);

  function handleDragStart(e: React.DragEvent, item: T) {
    e.stopPropagation();
    isDragging.current = true;
    dropFiredRef.current = false;
    dragIdRef.current = item.id;
    setDragId(item.id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', item.id);
    e.dataTransfer.setData(dragTypeKey, instanceKey.current);
    if (extraDragData) {
      for (const { type, value } of extraDragData(item)) {
        e.dataTransfer.setData(type, value);
      }
    }
  }

  function handleDragEnd(_e: React.DragEvent) {
    console.log('[dragend] fired');
    isDragging.current = false;
    dragIdRef.current = null;
    setDragId(null);
    setDragOverId(null);
  }

  function handleDragOver(e: React.DragEvent, targetId: string) {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    if (dragIdRef.current && dragIdRef.current !== targetId) {
      setDragOverId(targetId);
    }
  }

  function handleDragLeave(e: React.DragEvent, targetId: string) {
    e.stopPropagation();
    const related = e.relatedTarget as Node | null;
    if (!related || !(e.currentTarget as Node).contains(related)) {
      setDragOverId(prev => prev === targetId ? null : prev);
    }
  }

  function handleDrop(e: React.DragEvent, targetId: string) {
    e.preventDefault();
    e.stopPropagation();
    setDragOverId(null);
    // Reject drops that originated from a different list instance
    const sourceInstance = e.dataTransfer.getData(dragTypeKey);
    if (sourceInstance && sourceInstance !== instanceKey.current) {
      console.log('[drop] IGNORED — from different list instance', sourceInstance);
      return;
    }
    if (dropFiredRef.current) {
      console.log('[drop] IGNORED duplicate drop on', targetId);
      return;
    }
    dropFiredRef.current = true;
    const fromId = e.dataTransfer.getData('text/plain') || dragIdRef.current;
    console.log('[drop] from', fromId, '-> onto', targetId);
    if (!fromId || fromId === targetId) return;

    lastDropTime.current = Date.now();
    setOrderedIds(prev => {
      const next = [...prev];
      const fromIdx = next.indexOf(fromId);
      const toIdx   = next.indexOf(targetId);
      console.log('[drop] reorder: fromIdx', fromIdx, 'toIdx', toIdx, 'ids', next);
      if (fromIdx === -1 || toIdx === -1) return prev;
      next.splice(fromIdx, 1);
      next.splice(toIdx, 0, fromId);
      console.log('[drop] result', next);
      saveOrder(next);
      return next;
    });

    dragIdRef.current = null;
    setDragId(null);
  }

  return {
    orderedItems,
    dragHandleProps: (id: string) => ({
      draggable: true,
      onDragStart: (e: React.DragEvent) => handleDragStart(e, itemMap.get(id)!),
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
