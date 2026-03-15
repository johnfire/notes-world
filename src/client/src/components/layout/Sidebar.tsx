import { useState, useRef, useMemo } from 'react'; // useRef used in SortableTagRow
import { useApp } from '../../context/AppContext';
import { Tag } from '../../types';
import * as api from '../../api';
import { useSortableList } from '../../hooks/useSortableList';

interface SidebarProps {
  onTagSelect: (tag: Tag | null) => void;
  selectedTagId: string | null;
}

export function Sidebar({ onTagSelect, selectedTagId }: SidebarProps) {
  const { state, refresh } = useApp();
  const [collapsed, setCollapsed] = useState(false);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  const folderTags = useMemo(() => state.tags.filter(t => t.tag_source === 'folder'), [state.tags]);
  const fileTags   = useMemo(() => state.tags.filter(t => t.tag_source === 'file'),   [state.tags]);
  const otherTags  = useMemo(() => state.tags.filter(t => t.tag_source !== 'folder' && t.tag_source !== 'file'), [state.tags]);

  const folderSort = useSortableList(folderTags, 'tags:folder');
  const fileSort   = useSortableList(fileTags,   'tags:file');
  const otherSort  = useSortableList(otherTags,  'tags:other');

  async function handleItemDrop(e: React.DragEvent, toTag: Tag) {
    e.preventDefault();
    setDropTargetId(null);

    const itemId    = e.dataTransfer.getData('application/x-item-id');
    const fromTagId = e.dataTransfer.getData('application/x-from-tag-id');
    if (!itemId) return;

    const additive = e.shiftKey;

    await api.tags.tagItem(itemId, toTag.id);
    if (!additive && fromTagId && fromTagId !== toTag.id) {
      await api.tags.untagItem(itemId, fromTagId);
    }

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

  function renderTagSection(
    sortable: ReturnType<typeof useSortableList<Tag>>,
    opts?: { className?: string; selectedClassName?: string }
  ) {
    return sortable.orderedItems.map(tag => (
      <SortableTagRow
        key={tag.id}
        tag={tag}
        sortable={sortable}
        selected={selectedTagId === tag.id}
        isDropTarget={dropTargetId === tag.id}
        onTagSelect={onTagSelect}
        onItemDrop={handleItemDrop}
        onItemDragOver={handleDragOver}
        onItemDragLeave={handleDragLeave}
        className={opts?.className}
        selectedClassName={opts?.selectedClassName}
      />
    ));
  }

  return (
    <aside className="w-1/4 bg-surface-900 border-r border-surface-500 flex flex-col shrink-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-500">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Tags</span>
        <button onClick={() => setCollapsed(true)} className="text-gray-500 hover:text-white" title="Collapse sidebar">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* All items */}
      <button
        onClick={() => onTagSelect(null)}
        className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors ${
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

      <div className="flex-1 overflow-y-auto">

        {/* ── Folder tags ─────────────────────────────────────────── */}
        {folderTags.length > 0 && (
          <div className="border-b border-surface-600 pb-1 mb-1">
            {renderTagSection(folderSort, {
              className: 'font-medium text-surface-900 bg-white hover:bg-gray-100',
              selectedClassName: 'font-medium text-surface-900 bg-white ring-1 ring-inset ring-accent',
            })}
          </div>
        )}

        {/* ── File tags ────────────────────────────────────────────── */}
        {fileTags.length > 0 && (
          <div className="border-b border-surface-600 pb-1 mb-1">
            {renderTagSection(fileSort)}
          </div>
        )}

        {/* ── Other tags ───────────────────────────────────────────── */}
        {renderTagSection(otherSort)}

      </div>
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
  className?: string;
  selectedClassName?: string;
}

function SortableTagRow({
  tag, sortable, selected, isDropTarget,
  onTagSelect, onItemDrop, onItemDragOver, onItemDragLeave,
  className = 'text-gray-400 hover:text-white hover:bg-surface-700',
  selectedClassName = 'text-accent bg-surface-600',
}: SortableTagRowProps) {
  const dragAllowed = useRef(false);

  const base = isDropTarget
    ? 'text-white bg-accent/20 ring-1 ring-inset ring-accent'
    : selected
    ? selectedClassName
    : className;

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
        'w-full flex items-center text-sm transition-colors',
        base,
        sortable.dragId === tag.id ? 'opacity-40 scale-[0.98]' : '',
        sortable.dragOverId === tag.id ? 'border-t-2 border-accent' : '',
      ].filter(Boolean).join(' ')}
    >
      {/* Grip handle — mousedown enables drag for this row */}
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
      <button
        onClick={() => onTagSelect(tag)}
        className="flex-1 flex items-center justify-between pr-3 py-1.5 min-w-0"
      >
        <span className="flex items-center gap-2 truncate">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-dim shrink-0" />
          {tag.name}
        </span>
        {tag.count !== undefined && (
          <span className="text-xs opacity-50 ml-2">{tag.count}</span>
        )}
      </button>
    </div>
  );
}
