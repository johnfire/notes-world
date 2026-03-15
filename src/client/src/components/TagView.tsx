import { useEffect, useState, useRef } from 'react';
import { Tag, Item, Divider } from '../types';
import * as api from '../api';
import { useApp } from '../context/AppContext';
import { SortableList } from './SortableList';

interface Props {
  tag: Tag;
}

type ItemEntry    = { kind: 'item';    id: string } & Item;
type DividerEntry = { kind: 'divider'; id: string } & Omit<Divider, 'id'> & { dividerId: string };
type ListEntry    = ItemEntry | DividerEntry;

// Dividers travel through sort orders with a prefixed ID so they don't
// collide with item UUIDs. The prefix is stripped before API calls.
function dividerSortId(dividerId: string) { return `divider:${dividerId}`; }

function buildEntries(items: Item[], dividers: Divider[]): ListEntry[] {
  const itemEntries: ItemEntry[]    = items.map(i => ({ kind: 'item',    ...i }));
  const divEntries:  DividerEntry[] = dividers.map(d => ({
    kind: 'divider',
    id: dividerSortId(d.id),
    dividerId: d.id,
    user_id:    d.user_id,
    label:      d.label,
    created_at: d.created_at,
    updated_at: d.updated_at,
  }));
  return [...itemEntries, ...divEntries];
}

export function TagView({ tag }: Props) {
  const { openItem, state: { refreshKey } } = useApp();
  const [items,    setItems]    = useState<Item[]>([]);
  const [dividers, setDividers] = useState<Divider[]>([]);
  const [loading,  setLoading]  = useState(false);

  // inline edit state
  const [editingId,    setEditingId]    = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState('');
  const editRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.tags.getItemsForTag(tag.id),
      api.dividers.list(),
    ]).then(([fetchedItems, fetchedDividers]) => {
      setItems(fetchedItems);
      setDividers(fetchedDividers);
    }).finally(() => setLoading(false));
  }, [tag.id, refreshKey]);

  useEffect(() => {
    if (editingId) editRef.current?.focus();
  }, [editingId]);

  async function handleAddDivider() {
    const divider = await api.dividers.create();
    setDividers(prev => [...prev, divider]);
  }

  function startEdit(dividerId: string, currentLabel: string | null) {
    setEditingId(dividerId);
    setEditingLabel(currentLabel ?? '');
  }

  async function commitEdit(dividerId: string) {
    const trimmed = editingLabel.trim();
    const label   = trimmed === '' ? null : trimmed;
    const updated = await api.dividers.update(dividerId, label);
    setDividers(prev => prev.map(d => d.id === dividerId ? updated : d));
    setEditingId(null);
  }

  async function handleDeleteDivider(dividerId: string) {
    await api.dividers.delete(dividerId);
    setDividers(prev => prev.filter(d => d.id !== dividerId));
  }

  const entries = buildEntries(items, dividers);
  const itemCount = items.length;

  return (
    <div className="p-4 h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          {tag.name}
          {!loading && <span className="ml-2 text-gray-600 normal-case font-normal">{itemCount} items</span>}
        </h2>
        <button
          onClick={handleAddDivider}
          className="text-xs text-gray-500 hover:text-gray-300 transition-colors px-2 py-1 rounded hover:bg-surface-600"
        >
          + Divider
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-600 py-8 text-center">Loading…</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-gray-600 py-8 text-center">No items with this tag</p>
      ) : (
        <SortableList
          items={entries}
          contextKey={`tag:${tag.id}`}
          extraDragData={(entry) => entry.kind === 'item' ? [
            { type: 'application/x-item-id',    value: entry.id },
            { type: 'application/x-from-tag-id', value: tag.id },
          ] : []}
          className="grid grid-cols-3 gap-2"
          itemClassName={(entry) => entry.kind === 'divider' ? 'col-span-3' : ''}
          renderItem={(entry, dragHandle) => {
            if (entry.kind === 'divider') {
              return (
                <div className="flex items-center gap-2 py-1 group">
                  {dragHandle}
                  <div className="flex-1 flex items-center gap-2 min-w-0">
                    {editingId === entry.dividerId ? (
                      <input
                        ref={editRef}
                        value={editingLabel}
                        onChange={e => setEditingLabel(e.target.value)}
                        onBlur={() => commitEdit(entry.dividerId)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') commitEdit(entry.dividerId);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        className="bg-transparent border-b border-gray-500 text-xs text-gray-300 outline-none w-40"
                        placeholder="Label (optional)"
                      />
                    ) : (
                      <>
                        <div className="flex-1 flex items-center gap-2">
                          {entry.label && (
                            <span
                              onClick={() => startEdit(entry.dividerId, entry.label)}
                              className="text-xs text-gray-500 cursor-pointer hover:text-gray-300 shrink-0"
                            >
                              {entry.label}
                            </span>
                          )}
                          <div className="flex-1 h-px bg-surface-500" />
                          {!entry.label && (
                            <span
                              onClick={() => startEdit(entry.dividerId, entry.label)}
                              className="text-xs text-gray-700 cursor-pointer hover:text-gray-500 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              add label
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => handleDeleteDivider(entry.dividerId)}
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

            return (
              <div className="card hover:border-surface-400 hover:bg-surface-600 transition-colors py-2 px-3 flex items-center gap-2">
                {dragHandle}
                <button
                  onClick={() => openItem(entry.id)}
                  className="flex-1 text-left min-w-0"
                >
                  <p className="text-sm text-gray-200">{entry.title}</p>
                  {entry.body && (
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{entry.body}</p>
                  )}
                </button>
              </div>
            );
          }}
        />
      )}
    </div>
  );
}
