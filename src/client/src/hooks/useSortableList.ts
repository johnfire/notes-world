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

let instanceCounter = 0;

export function useSortableList<T extends HasId>(
  items: T[],
  contextKey: string | null,
  extraDragData?: (item: T) => ExtraDragData[]
): UseSortableListResult<T> {
  const [orderedIds, setOrderedIds] = useState<string[]>([]);
  const [dragId,     setDragId]     = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [loaded,     setLoaded]     = useState(false);

  const dragIdRef   = useRef<string | null>(null);
  const instanceKey = useRef(`sortable-${++instanceCounter}`);
  const dragTypeKey = 'application/x-sortable-source';

  // ── Load sort order once per contextKey ──────────────────────────────────
  useEffect(() => {
    setLoaded(false);
    if (!contextKey || items.length === 0) {
      setOrderedIds(items.map(i => i.id));
      setLoaded(true);
      return;
    }

    let cancelled = false;
    api.sortOrders.get(contextKey).then(rows => {
      if (cancelled) return;
      const allIds = items.map(i => i.id);
      if (rows.length === 0) {
        setOrderedIds(allIds);
      } else {
        const orderMap = new Map(rows.map(r => [r.item_id, r.sort_order]));
        const sorted = [...allIds].sort((a, b) => {
          const oa = orderMap.has(a) ? orderMap.get(a)! : Infinity;
          const ob = orderMap.has(b) ? orderMap.get(b)! : Infinity;
          return oa - ob;
        });
        setOrderedIds(sorted);
      }
      setLoaded(true);
    }).catch(() => {
      if (!cancelled) {
        setOrderedIds(items.map(i => i.id));
        setLoaded(true);
      }
    });

    return () => { cancelled = true; };
  // Only re-fetch when the context itself changes, not when items change.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextKey]);

  // ── Sync orderedIds when items are added or removed ──────────────────────
  // No server fetch — just patch the local list.
  useEffect(() => {
    if (!loaded) return;
    setOrderedIds(prev => {
      const currentSet = new Set(items.map(i => i.id));
      const prevSet    = new Set(prev);

      // Remove IDs no longer in items
      const kept = prev.filter(id => currentSet.has(id));
      // Append new IDs at the end
      const added = items.map(i => i.id).filter(id => !prevSet.has(id));

      if (added.length === 0 && kept.length === prev.length) return prev;
      const result = [...kept, ...added];
      console.log('[sync effect] items changed — removed', prev.length - kept.length, 'added', added.length, 'result', result);
      return result;
    });
  }, [items, loaded]);

  // ── Derive ordered items from orderedIds + items ─────────────────────────
  const itemMap = new Map(items.map(i => [i.id, i]));
  const orderedItems = orderedIds
    .map(id => itemMap.get(id))
    .filter((i): i is T => i !== undefined);

  // ── Save: fire-and-forget, no debounce ───────────────────────────────────
  const saveOrder = useCallback((ids: string[]) => {
    if (!contextKey) return;
    api.sortOrders.save(contextKey, ids).catch(console.error);
  }, [contextKey]);

  // ── Drag handlers ────────────────────────────────────────────────────────
  function handleDragStart(e: React.DragEvent, item: T) {
    e.stopPropagation();
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

    // Reject drops from a different list instance
    const sourceInstance = e.dataTransfer.getData(dragTypeKey);
    if (sourceInstance && sourceInstance !== instanceKey.current) {
      console.log('[drop] REJECTED cross-list', sourceInstance, '!==', instanceKey.current);
      return;
    }

    const fromId = e.dataTransfer.getData('text/plain') || dragIdRef.current;
    console.log('[drop] from', fromId, '-> onto', targetId, 'instance', instanceKey.current);
    if (!fromId || fromId === targetId) return;

    setOrderedIds(prev => {
      const next = [...prev];
      const fromIdx = next.indexOf(fromId);
      const toIdx   = next.indexOf(targetId);
      console.log('[drop] reorder fromIdx', fromIdx, 'toIdx', toIdx);
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
