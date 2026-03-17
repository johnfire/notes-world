import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Tag, Item, ItemType } from '../types';
import * as api from '../api';
import { useApp } from '../context/AppContext';
import { SortableList } from './SortableList';
import { linkify } from '../utils/linkify';
import { ColorDot } from './tag-view/ColorDot';
import { DividerRow } from './tag-view/DividerRow';

interface Props {
  tag: Tag;
}

export function TagView({ tag }: Props) {
  const { openItem, state: { refreshKey, unsortedItems }, removeUnsorted } = useApp();
  const [items,   setItems]   = useState<Item[]>([]);
  const [visualOrder, setVisualOrder] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [collapsedSet, setCollapsedSet] = useState<Set<string>>(new Set());

  const prevTagId = useRef(tag.id);

  useEffect(() => {
    const isTagChange = tag.id !== prevTagId.current;
    prevTagId.current = tag.id;
    setLoading(true);
    Promise.all([
      api.tags.getItemsForTag(tag.id, 500),
      api.collapsedDividers.get(tag.id),
    ]).then(([fetchedItems, collapsed]) => {
      setItems(fetchedItems);
      if (isTagChange) setVisualOrder(fetchedItems);
      setCollapsedSet(new Set(collapsed));
    }).finally(() => setLoading(false));
  }, [tag.id, refreshKey]);

  const handleReorder = useCallback((ordered: Item[]) => {
    setVisualOrder(ordered);
  }, []);

  function toggleCollapse(dividerId: string) {
    setCollapsedSet(prev => {
      const next = new Set(prev);
      if (next.has(dividerId)) next.delete(dividerId);
      else next.add(dividerId);
      void api.collapsedDividers.save(tag.id, Array.from(next));
      return next;
    });
  }

  // Build a map: itemId -> parent dividerId (or null if above all dividers)
  function getParentDividerMap(): Map<string, string | null> {
    const map = new Map<string, string | null>();
    let currentDivider: string | null = null;
    for (const item of visualOrder) {
      if (item.item_type === ItemType.Divider) {
        currentDivider = item.id;
        map.set(item.id, null);
      } else {
        map.set(item.id, currentDivider);
      }
    }
    return map;
  }

  // Count non-divider items under each divider
  function getHiddenCounts(): Map<string, number> {
    const counts = new Map<string, number>();
    let currentDivider: string | null = null;
    for (const item of visualOrder) {
      if (item.item_type === ItemType.Divider) {
        currentDivider = item.id;
      } else if (currentDivider) {
        counts.set(currentDivider, (counts.get(currentDivider) ?? 0) + 1);
      }
    }
    return counts;
  }

  const parentDividerMap = getParentDividerMap();
  const hiddenCounts = getHiddenCounts();

  async function handleAddDivider() {
    const divider = await api.items.createDivider();
    await api.tags.tagItem(divider.id, tag.id);
    setItems(prev => [...prev, divider]);
  }

  async function handleSaveDivider(id: string, title: string) {
    const updated = await api.items.update(id, { title });
    setItems(prev => prev.map(i => i.id === id ? updated : i));
  }

  async function handleDeleteDivider(id: string) {
    await api.items.archive(id);
    setItems(prev => prev.filter(i => i.id !== id));
  }

  async function handleArchiveItem(id: string) {
    await api.items.archive(id);
    setItems(prev => prev.filter(i => i.id !== id));
  }

  async function handleColorChange(id: string, color: string | null) {
    const updated = await api.items.update(id, { color });
    setItems(prev => prev.map(i => i.id === id ? updated : i));
  }

  // Staging: items in this tag's list that are still unsorted
  const unsortedIds = new Set(unsortedItems.map(i => i.id));
  const stagedItems = items.filter(i => unsortedIds.has(i.id));
  const sortedItems = items.filter(i => !unsortedIds.has(i.id));

  const handleExternalDrop = useCallback((itemId: string) => {
    removeUnsorted(itemId);
  }, [removeUnsorted]);

  function handleStageDragStart(e: React.DragEvent, item: Item) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', item.id);
    e.dataTransfer.setData('application/x-item-id', item.id);
    e.dataTransfer.setData('application/x-from-tag-id', tag.id);
    e.dataTransfer.setData('application/x-from-staging', '1');
  }

  const itemCount = sortedItems.filter(i => i.item_type !== ItemType.Divider).length;

  return (
    <div className="p-4 h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          {tag.name}
          {!loading && <span className="ml-2 text-gray-600 normal-case font-normal">{itemCount} items</span>}
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.location.href = `/api/export/tag/${tag.id}`}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors px-2 py-1 rounded hover:bg-surface-600"
            title="Export as markdown"
          >
            Export
          </button>
          <button
            onClick={handleAddDivider}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors px-2 py-1 rounded hover:bg-surface-600"
          >
            + Divider
          </button>
        </div>
      </div>

      {/* Staging area */}
      {stagedItems.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
            Unsorted ({stagedItems.length})
          </p>
          <div className="flex flex-col gap-1.5">
            {stagedItems.map(item => (
              <div
                key={item.id}
                draggable
                onDragStart={e => handleStageDragStart(e, item)}
                className="card bg-surface-700 border-dashed border-accent/40 hover:border-accent py-2 px-3 flex items-center gap-2 cursor-grab active:cursor-grabbing transition-colors"
              >
                <svg className="w-4 h-4 text-gray-600 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="9" cy="5" r="1.5" /><circle cx="15" cy="5" r="1.5" />
                  <circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
                  <circle cx="9" cy="19" r="1.5" /><circle cx="15" cy="19" r="1.5" />
                </svg>
                <button
                  onClick={() => openItem(item.id)}
                  className="flex-1 text-left min-w-0"
                >
                  <p className="text-sm text-gray-200">{item.title}</p>
                </button>
                <button
                  onClick={() => removeUnsorted(item.id)}
                  className="text-xs text-gray-600 hover:text-gray-400 shrink-0"
                  title="Place at end of list"
                >
                  ↓
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-600 py-8 text-center">Loading…</p>
      ) : sortedItems.length === 0 && stagedItems.length === 0 ? (
        <p className="text-sm text-gray-600 py-8 text-center">No items with this tag</p>
      ) : (
        <SortableList
          items={sortedItems}
          contextKey={`tag:${tag.id}`}
          onReorder={handleReorder}
          onExternalDrop={handleExternalDrop}
          extraDragData={(item) => item.item_type !== ItemType.Divider ? [
            { type: 'application/x-item-id',    value: item.id },
            { type: 'application/x-from-tag-id', value: tag.id },
          ] : []}
          className="flex flex-col gap-2"
          renderItem={(item, dragHandle) => {
            if (item.item_type === ItemType.Divider) {
              return (
                <DividerRow
                  item={item}
                  dragHandle={dragHandle}
                  onSave={handleSaveDivider}
                  onDelete={handleDeleteDivider}
                  onColorChange={(c) => handleColorChange(item.id, c)}
                  collapsed={collapsedSet.has(item.id)}
                  onToggle={() => toggleCollapse(item.id)}
                  hiddenCount={hiddenCounts.get(item.id) ?? 0}
                />
              );
            }
            const parentDivider = parentDividerMap.get(item.id);
            if (parentDivider && collapsedSet.has(parentDivider)) {
              return null;
            }
            return (
              <div className="card hover:border-surface-400 hover:bg-surface-600 transition-colors py-2 px-3 flex items-center gap-2 group">
                {dragHandle}
                <ColorDot color={item.color} onChange={(c) => handleColorChange(item.id, c)} />
                <button
                  onClick={() => openItem(item.id)}
                  className="flex-1 text-left min-w-0"
                >
                  <p className="text-sm" style={item.color ? { color: item.color } : undefined}>{item.title}</p>
                  {item.body && (
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{linkify(item.body)}</p>
                  )}
                </button>
                <button
                  onClick={() => handleArchiveItem(item.id)}
                  className="text-gray-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 shrink-0 text-xs"
                  title="Move to trash"
                >
                  ✕
                </button>
              </div>
            );
          }}
        />
      )}
    </div>
  );
}
