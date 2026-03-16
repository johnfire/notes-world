import React, { useEffect, useState, useRef } from 'react';
import { Tag, Item, ItemType } from '../types';
import * as api from '../api';
import { useApp } from '../context/AppContext';
import { SortableList } from './SortableList';

// ── DividerRow ────────────────────────────────────────────────────────────────
// Isolated component so its edit state doesn't cause the parent list to re-render.

interface DividerRowProps {
  item:       Item;
  dragHandle: React.ReactNode;
  onSave:     (id: string, title: string) => Promise<void>;
  onDelete:   (id: string) => Promise<void>;
}

function DividerRow({ item, dragHandle, onSave, onDelete }: DividerRowProps) {
  const [editing, setEditing] = useState(false);
  const [label,   setLabel]   = useState(item.title);
  const inputRef      = useRef<HTMLInputElement>(null);
  const committingRef = useRef(false);

  useEffect(() => { setLabel(item.title); }, [item.title]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  function startEdit() {
    committingRef.current = false;
    setEditing(true);
  }

  async function commit() {
    if (committingRef.current) return;
    committingRef.current = true;
    setEditing(false);
    await onSave(item.id, label.trim());
    committingRef.current = false;
  }

  return (
    <div className="card py-2 px-3 flex items-center gap-2 group">
      {dragHandle}
      <div className="flex-1 flex items-center gap-1 min-w-0">
        {editing ? (
          <input
            ref={inputRef}
            value={label}
            onChange={e => setLabel(e.target.value)}
            onBlur={commit}
            onKeyDown={e => {
              if (e.key === 'Enter')  commit();
              if (e.key === 'Escape') { setEditing(false); setLabel(item.title); }
            }}
            className="bg-transparent border-b border-gray-500 text-xs text-gray-300 outline-none w-full"
            placeholder="Label (optional)"
          />
        ) : (
          <>
            <div className="flex-1 flex items-center gap-1 min-w-0">
              <div className="flex-1 h-px bg-surface-500" />
              {item.title ? (
                <span
                  onClick={startEdit}
                  className="text-xs text-gray-500 cursor-pointer hover:text-gray-300 shrink-0 truncate max-w-[60%]"
                >
                  {item.title}
                </span>
              ) : (
                <span
                  onClick={startEdit}
                  className="text-xs text-gray-700 cursor-pointer hover:text-gray-500 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  label
                </span>
              )}
              <div className="flex-1 h-px bg-surface-500" />
            </div>
            <button
              onClick={() => onDelete(item.id)}
              className="text-gray-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 shrink-0 text-xs"
              title="Remove divider"
            >
              ✕
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── TagView ───────────────────────────────────────────────────────────────────

interface Props {
  tag: Tag;
}

export function TagView({ tag }: Props) {
  const { openItem, state: { refreshKey } } = useApp();
  const [items,   setItems]   = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.tags.getItemsForTag(tag.id)
      .then(setItems)
      .finally(() => setLoading(false));
  }, [tag.id, refreshKey]);

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

  const itemCount = items.filter(i => i.item_type !== ItemType.Divider).length;

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

      {loading ? (
        <p className="text-sm text-gray-600 py-8 text-center">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-600 py-8 text-center">No items with this tag</p>
      ) : (
        <SortableList
          items={items}
          contextKey={`tag:${tag.id}`}
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
                />
              );
            }
            return (
              <div className="card hover:border-surface-400 hover:bg-surface-600 transition-colors py-2 px-3 flex items-center gap-2 group">
                {dragHandle}
                <button
                  onClick={() => openItem(item.id)}
                  className="flex-1 text-left min-w-0"
                >
                  <p className="text-sm text-gray-200">{item.title}</p>
                  {item.body && (
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{item.body}</p>
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
