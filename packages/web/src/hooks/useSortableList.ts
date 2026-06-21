import { useState, useEffect, useRef, useCallback } from "react";
import * as api from "../api";

interface HasId {
  id: string;
}

export interface ExtraDragData {
  type: string;
  value: string;
}

// Where a drop lands relative to the hovered row: onto its middle ("into" — make
// it a child) or onto its top edge ("before" — make it a sibling). Only computed
// when an onTreeDrop handler is supplied; otherwise the list is a flat reorder.
export type DropMode = "into" | "before";

interface UseSortableListResult<T extends HasId> {
  orderedItems: T[];
  dragHandleProps: (id: string) => {
    draggable: true;
    onDragStart: (e: React.DragEvent) => void;
    onDragEnd: (e: React.DragEvent) => void;
  };
  dropZoneProps: (id: string) => {
    onDragOver: (e: React.DragEvent) => void;
    onDragLeave: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
  };
  dragOverId: string | null;
  dropMode: DropMode | null;
  dragId: string | null;
}

let instanceCounter = 0;

export function useSortableList<T extends HasId>(
  items: T[],
  contextKey: string | null,
  extraDragData?: (item: T) => ExtraDragData[],
  onExternalDrop?: (itemId: string, targetId: string) => void,
  // When supplied, internal drags are delegated here (with their drop mode)
  // instead of doing the default flat reorder — this is what makes the list a
  // tree. The caller owns the resulting parent + order changes.
  onTreeDrop?: (fromId: string, targetId: string, mode: DropMode) => void,
): UseSortableListResult<T> {
  const [orderedIds, setOrderedIds] = useState<string[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dropMode, setDropMode] = useState<DropMode | null>(null);
  const [loaded, setLoaded] = useState(false);

  const dragIdRef = useRef<string | null>(null);
  const instanceKey = useRef(`sortable-${++instanceCounter}`);
  const dragTypeKey = "application/x-sortable-source";

  // Saved positions for the current contextKey, applied whenever the list is
  // (re)built from scratch — items often arrive after the fetch resolves.
  const serverOrder = useRef<Map<string, number>>(new Map());

  const sortBySavedOrder = useCallback((ids: string[]) => {
    const order = serverOrder.current;
    return [...ids].sort((a, b) => {
      const oa = order.has(a) ? order.get(a)! : Infinity;
      const ob = order.has(b) ? order.get(b)! : Infinity;
      return oa - ob;
    });
  }, []);

  // ── Load sort order once per contextKey ──────────────────────────────────
  useEffect(() => {
    setLoaded(false);
    serverOrder.current = new Map();
    if (!contextKey) {
      setOrderedIds(items.map((i) => i.id));
      setLoaded(true);
      return;
    }

    let cancelled = false;
    api.sortOrders
      .get(contextKey)
      .then((rows) => {
        if (cancelled) return;
        serverOrder.current = new Map(
          rows.map((r) => [r.item_id, r.sort_order]),
        );
        setOrderedIds(sortBySavedOrder(items.map((i) => i.id)));
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) {
          setOrderedIds(items.map((i) => i.id));
          setLoaded(true);
        }
      });

    return () => {
      cancelled = true;
    };
    // Only re-fetch when the context itself changes, not when items change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextKey]);

  // ── Sync orderedIds when items are added or removed ──────────────────────
  // No server fetch — just patch the local list.
  useEffect(() => {
    if (!loaded) return;
    setOrderedIds((prev) => {
      const currentSet = new Set(items.map((i) => i.id));
      const prevSet = new Set(prev);

      // Remove IDs no longer in items
      const kept = prev.filter((id) => currentSet.has(id));
      const added = items.map((i) => i.id).filter((id) => !prevSet.has(id));

      if (added.length === 0 && kept.length === prev.length) return prev;
      // Fresh list (initial load or context switch): apply the saved order.
      // Otherwise keep the existing order and append new items at the end.
      return kept.length === 0 ? sortBySavedOrder(added) : [...kept, ...added];
    });
  }, [items, loaded, sortBySavedOrder]);

  // ── Derive ordered items from orderedIds + items ─────────────────────────
  const itemMap = new Map(items.map((i) => [i.id, i]));
  const orderedItems = orderedIds
    .map((id) => itemMap.get(id))
    .filter((i): i is T => i !== undefined);

  // ── Save: fire-and-forget, no debounce ───────────────────────────────────
  const saveOrder = useCallback(
    (ids: string[]) => {
      if (!contextKey) return;
      api.sortOrders.save(contextKey, ids).catch(console.error);
    },
    [contextKey],
  );

  // ── Drag handlers ────────────────────────────────────────────────────────
  function handleDragStart(e: React.DragEvent, item: T) {
    e.stopPropagation();
    dragIdRef.current = item.id;
    setDragId(item.id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", item.id);
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
    setDropMode(null);
  }

  function handleDragOver(e: React.DragEvent, targetId: string) {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    const isInternal = dragIdRef.current && dragIdRef.current !== targetId;
    const isExternal =
      !dragIdRef.current &&
      e.dataTransfer.types.includes("application/x-from-staging");
    if (isInternal || isExternal) {
      setDragOverId(targetId);
      // Tree mode: top third of the row nests before/as-sibling, the rest nests
      // the dragged item *into* the hovered row.
      if (isInternal && onTreeDrop) {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const intoBody = e.clientY - rect.top > rect.height * 0.35;
        setDropMode(intoBody ? "into" : "before");
      }
    }
  }

  function handleDragLeave(e: React.DragEvent, targetId: string) {
    e.stopPropagation();
    const related = e.relatedTarget as Node | null;
    if (!related || !(e.currentTarget as Node).contains(related)) {
      setDragOverId((prev) => (prev === targetId ? null : prev));
      setDropMode(null);
    }
  }

  function handleDrop(e: React.DragEvent, targetId: string) {
    e.preventDefault();
    e.stopPropagation();
    setDragOverId(null);

    // Reject drops from a different list instance
    const sourceInstance = e.dataTransfer.getData(dragTypeKey);
    if (sourceInstance && sourceInstance !== instanceKey.current) {
      console.log(
        "[drop] REJECTED cross-list",
        sourceInstance,
        "!==",
        instanceKey.current,
      );
      return;
    }

    const fromId = e.dataTransfer.getData("text/plain") || dragIdRef.current;
    console.log(
      "[drop] from",
      fromId,
      "-> onto",
      targetId,
      "instance",
      instanceKey.current,
    );
    if (!fromId || fromId === targetId) return;

    // Tree mode: hand internal drags to the caller (which owns the parent +
    // order changes). External/staging drops fall through to the flat insert.
    if (onTreeDrop && dragIdRef.current) {
      const mode = dropMode ?? "into";
      setDropMode(null);
      dragIdRef.current = null;
      setDragId(null);
      onTreeDrop(fromId, targetId, mode);
      return;
    }

    setOrderedIds((prev) => {
      const next = [...prev];
      const fromIdx = next.indexOf(fromId);
      const toIdx = next.indexOf(targetId);
      console.log("[drop] reorder fromIdx", fromIdx, "toIdx", toIdx);
      if (toIdx === -1) return prev;
      if (fromIdx === -1) {
        // External item (e.g. from staging) — insert at target position
        next.splice(toIdx, 0, fromId);
        console.log("[drop] external insert", next);
        saveOrder(next);
        onExternalDrop?.(fromId, targetId);
        return next;
      }
      next.splice(fromIdx, 1);
      next.splice(toIdx, 0, fromId);
      console.log("[drop] result", next);
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
      onDragEnd: (e: React.DragEvent) => handleDragEnd(e),
    }),
    dropZoneProps: (id: string) => ({
      onDragOver: (e: React.DragEvent) => handleDragOver(e, id),
      onDragLeave: (e: React.DragEvent) => handleDragLeave(e, id),
      onDrop: (e: React.DragEvent) => handleDrop(e, id),
    }),
    dragOverId,
    dropMode,
    dragId,
  };
}
