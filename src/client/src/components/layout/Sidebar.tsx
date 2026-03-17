import { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { Tag } from '../../types';
import * as api from '../../api';
import { useSortableList } from '../../hooks/useSortableList';
import { PALETTE } from '../../utils/colors';

interface SidebarProps {
  onTagSelect: (tag: Tag | null) => void;
  selectedTagId: string | null;
  onTrashSelect: () => void;
  showTrash: boolean;
}

export function Sidebar({ onTagSelect, selectedTagId, onTrashSelect, showTrash }: SidebarProps) {
  const { state, refresh, loadTags, removeUnsorted } = useApp();
  const [collapsed, setCollapsed] = useState(false);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const createInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (adding) createInputRef.current?.focus(); }, [adding]);

  function cancelAdding() {
    setAdding(false);
    setNewName('');
    setCreateError(null);
  }

  async function handleCreateTag(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;
    if (trimmed.length > 100) {
      setCreateError('Tag name must be 100 characters or less');
      return;
    }
    setSaving(true);
    setCreateError(null);
    try {
      await api.tags.create(trimmed);
      await loadTags();
      cancelAdding();
    } catch (err) {
      setCreateError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const allSort = useSortableList(state.tags, 'tags:all');

  async function handleItemDrop(e: React.DragEvent, toTag: Tag) {
    e.preventDefault();
    setDropTargetId(null);

    const itemId      = e.dataTransfer.getData('application/x-item-id');
    const fromTagId   = e.dataTransfer.getData('application/x-from-tag-id');
    const fromStaging = e.dataTransfer.getData('application/x-from-staging');
    if (!itemId) return;

    const additive = e.shiftKey;

    await api.tags.tagItem(itemId, toTag.id);
    if (!additive && fromTagId && fromTagId !== toTag.id) {
      await api.tags.untagItem(itemId, fromTagId);
    }
    if (fromStaging) removeUnsorted(itemId);

    void refresh();
  }

  function handleDragOver(e: React.DragEvent, tagId: string) {
    if (!e.dataTransfer.types.includes('application/x-item-id')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTargetId(tagId);
  }

  function handleDragLeave(e: React.DragEvent) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDropTargetId(null);
    }
  }

  const handleColorChange = useCallback(async (tagId: string, color: string | null) => {
    try {
      await api.tags.setColor(tagId, color);
      await loadTags();
    } catch { /* ignore */ }
  }, [loadTags]);

  if (collapsed) {
    return (
      <aside className="w-10 bg-surface-900 border-r border-surface-500 flex flex-col items-center py-3 shrink-0">
        <button
          onClick={() => setCollapsed(false)}
          className="text-gray-500 hover:text-white p-1"
          title="Expand sidebar"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </aside>
    );
  }

  function renderTagList() {
    return allSort.orderedItems.map(tag => (
      <SortableTagRow
        key={tag.id}
        tag={tag}
        sortable={allSort}
        selected={selectedTagId === tag.id}
        isDropTarget={dropTargetId === tag.id}
        onTagSelect={onTagSelect}
        onItemDrop={handleItemDrop}
        onItemDragOver={handleDragOver}
        onItemDragLeave={handleDragLeave}
        onColorChange={handleColorChange}
      />
    ));
  }

  return (
    <aside className="w-1/4 bg-surface-900 border-r border-surface-500 flex flex-col shrink-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-500">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Tags</span>
          {!adding && (
            <button
              onClick={() => setAdding(true)}
              className="text-gray-500 hover:text-accent transition-colors text-sm leading-none"
              title="Create tag"
            >
              +
            </button>
          )}
        </div>
        <button onClick={() => setCollapsed(true)} className="text-gray-500 hover:text-white" title="Collapse sidebar">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* Inline tag creation */}
      {adding && (
        <div className="px-3 py-2 border-b border-surface-500">
          <form onSubmit={handleCreateTag} className="flex items-center gap-1.5">
            <input
              ref={createInputRef}
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Escape') cancelAdding(); }}
              placeholder="Tag name…"
              maxLength={100}
              className="input text-sm flex-1 min-w-0 px-2 py-1"
              autoComplete="off"
              disabled={saving}
            />
            <button type="submit" disabled={!newName.trim() || saving} className="btn-primary text-xs px-2 py-1">
              {saving ? '…' : 'Add'}
            </button>
            <button type="button" onClick={cancelAdding} className="btn-ghost text-xs px-1 py-1">
              ✕
            </button>
          </form>
          {createError && <p className="text-xs text-red-400 mt-1">{createError}</p>}
        </div>
      )}

      {/* All items */}
      <div className="flex items-center">
        <button
          onClick={() => onTagSelect(null)}
          className={`flex-1 flex items-center gap-2 px-4 py-2 text-sm transition-colors ${
            selectedTagId === null
              ? 'text-white bg-surface-600'
              : 'text-gray-400 hover:text-white hover:bg-surface-700'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          All Items
        </button>
        <button
          onClick={() => window.location.href = '/api/export/untagged'}
          className="text-gray-600 hover:text-gray-300 transition-colors px-2 py-2 text-xs shrink-0"
          title="Export untagged items as markdown"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {renderTagList()}
      </div>

      {/* ── Trash ─────────────────────────────────────────────────── */}
      <button
        onClick={onTrashSelect}
        className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors border-t border-surface-500 shrink-0 ${
          showTrash
            ? 'text-white bg-surface-600'
            : 'text-gray-500 hover:text-white hover:bg-surface-700'
        }`}
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        Trash
      </button>
    </aside>
  );
}

// ── SortableTagRow ────────────────────────────────────────────────────────────
// Puts draggable on the row itself, gated by a mousedown on the grip handle.
// This ensures drag events and drop zones are on the same element, avoiding
// the nested-draggable / premature-dragleave issues.

interface SortableTagRowProps {
  tag: Tag;
  sortable: ReturnType<typeof useSortableList<Tag>>;
  selected: boolean;
  isDropTarget: boolean;
  onTagSelect: (tag: Tag) => void;
  onItemDrop: (e: React.DragEvent, tag: Tag) => Promise<void>;
  onItemDragOver: (e: React.DragEvent, tagId: string) => void;
  onItemDragLeave: (e: React.DragEvent) => void;
  onColorChange: (tagId: string, color: string | null) => void;
}

function SortableTagRow({
  tag, sortable, selected, isDropTarget,
  onTagSelect, onItemDrop, onItemDragOver, onItemDragLeave,
  onColorChange,
}: SortableTagRowProps) {
  const dragAllowed = useRef(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showColorPicker) return;
    function handleClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowColorPicker(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showColorPicker]);

  const tagColor = tag.color;
  const hasColor = !!tagColor;

  const base = isDropTarget
    ? 'text-white bg-accent/20 ring-1 ring-inset ring-accent'
    : selected
    ? (hasColor ? 'bg-surface-600' : 'text-accent bg-surface-600')
    : (hasColor ? 'hover:bg-surface-700' : 'text-gray-400 hover:text-white hover:bg-surface-700');

  const { dragHandleProps, dropZoneProps } = sortable;
  const { onDragStart, onDragEnd } = dragHandleProps(tag.id);
  const { onDragOver: sortableDragOver, onDragLeave: sortableDragLeave, onDrop: sortableDrop } = dropZoneProps(tag.id);

  return (
    <div
      draggable
      onDragStart={(e) => {
        if (!dragAllowed.current) { e.preventDefault(); return; }
        onDragStart(e);
      }}
      onDragEnd={(e) => { dragAllowed.current = false; onDragEnd(e); }}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('application/x-item-id')) {
          onItemDragOver(e, tag.id);
        } else {
          sortableDragOver(e);
        }
      }}
      onDragLeave={(e) => {
        onItemDragLeave(e);
        sortableDragLeave(e);
      }}
      onDrop={(e) => {
        if (e.dataTransfer.types.includes('application/x-item-id')) {
          void onItemDrop(e, tag);
        } else {
          sortableDrop(e);
        }
      }}
      className={[
        'w-full flex items-center text-sm transition-colors relative',
        base,
        sortable.dragId === tag.id ? 'opacity-40 scale-[0.98]' : '',
        sortable.dragOverId === tag.id ? 'border-t-2 border-accent' : '',
      ].filter(Boolean).join(' ')}
      style={hasColor ? { color: tagColor } : undefined}
    >
      {/* Grip handle */}
      <div
        onMouseDown={() => { dragAllowed.current = true; }}
        onMouseUp={() => { dragAllowed.current = false; }}
        onClick={e => e.stopPropagation()}
        className="cursor-grab active:cursor-grabbing px-1.5 py-1.5 text-gray-600 hover:text-gray-400 shrink-0"
        title="Drag to reorder"
      >
        <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="9"  cy="5"  r="1.5" />
          <circle cx="15" cy="5"  r="1.5" />
          <circle cx="9"  cy="12" r="1.5" />
          <circle cx="15" cy="12" r="1.5" />
          <circle cx="9"  cy="19" r="1.5" />
          <circle cx="15" cy="19" r="1.5" />
        </svg>
      </div>

      {/* Color dot — click to open picker */}
      <div className="relative shrink-0" ref={pickerRef}>
        <button
          onClick={(e) => { e.stopPropagation(); setShowColorPicker(!showColorPicker); }}
          className="w-3 h-3 rounded-full border border-gray-600 hover:border-gray-400 transition-colors"
          style={{ backgroundColor: tagColor ?? 'var(--color-accent-dim, #4b5563)' }}
          title="Set color"
        />
        {showColorPicker && (
          <div className="absolute left-0 top-full mt-1 z-50 bg-surface-800 border border-surface-500 rounded-lg p-2 shadow-xl grid grid-cols-4 gap-1.5 w-[120px]">
            {PALETTE.map(c => (
              <button
                key={c.value}
                onClick={(e) => {
                  e.stopPropagation();
                  onColorChange(tag.id, c.value);
                  setShowColorPicker(false);
                }}
                className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-125 ${
                  tagColor === c.value ? 'border-white scale-110' : 'border-transparent'
                }`}
                style={{ backgroundColor: c.value }}
                title={c.name}
              />
            ))}
            {tagColor && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onColorChange(tag.id, null);
                  setShowColorPicker(false);
                }}
                className="col-span-4 text-xs text-gray-400 hover:text-white mt-1 transition-colors"
              >
                Remove color
              </button>
            )}
          </div>
        )}
      </div>

      <button
        onClick={() => onTagSelect(tag)}
        className="flex-1 flex items-center justify-between pr-3 py-1.5 pl-2 min-w-0"
      >
        <span className="truncate">{tag.name}</span>
        {tag.count !== undefined && (
          <span className="text-xs opacity-50 ml-2">{tag.count}</span>
        )}
      </button>
    </div>
  );
}
