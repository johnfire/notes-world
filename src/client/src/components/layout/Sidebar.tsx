import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Tag } from '../../types';
import * as api from '../../api';

interface SidebarProps {
  onTagSelect: (tag: Tag | null) => void;
  selectedTagId: string | null;
}

export function Sidebar({ onTagSelect, selectedTagId }: SidebarProps) {
  const { state, refresh } = useApp();
  const [collapsed, setCollapsed] = useState(false);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  async function handleDrop(e: React.DragEvent, toTag: Tag) {
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

  const folderTags   = state.tags.filter(t => t.tag_source === 'folder');
  const fileTags     = state.tags.filter(t => t.tag_source === 'file');
  const otherTags    = state.tags.filter(t => t.tag_source !== 'folder' && t.tag_source !== 'file');

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

  return (
    <aside className="w-56 bg-surface-900 border-r border-surface-500 flex flex-col shrink-0 overflow-hidden">
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
            {folderTags.map(tag => (
              <TagButton
                key={tag.id}
                tag={tag}
                selected={selectedTagId === tag.id}
                isDropTarget={dropTargetId === tag.id}
                onClick={() => onTagSelect(tag)}
                onDragOver={(e) => handleDragOver(e, tag.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => void handleDrop(e, tag)}
                className="font-medium text-surface-900 bg-white hover:bg-gray-100"
                selectedClassName="font-medium text-surface-900 bg-white ring-1 ring-inset ring-accent"
              />
            ))}
          </div>
        )}

        {/* ── File tags ────────────────────────────────────────────── */}
        {fileTags.length > 0 && (
          <div className="border-b border-surface-600 pb-1 mb-1">
            {fileTags.map(tag => (
              <TagButton
                key={tag.id}
                tag={tag}
                selected={selectedTagId === tag.id}
                isDropTarget={dropTargetId === tag.id}
                onClick={() => onTagSelect(tag)}
                onDragOver={(e) => handleDragOver(e, tag.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => void handleDrop(e, tag)}
              />
            ))}
          </div>
        )}

        {/* ── Other tags ───────────────────────────────────────────── */}
        {otherTags.map(tag => (
          <TagButton
            key={tag.id}
            tag={tag}
            selected={selectedTagId === tag.id}
            isDropTarget={dropTargetId === tag.id}
            onClick={() => onTagSelect(tag)}
            onDragOver={(e) => handleDragOver(e, tag.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => void handleDrop(e, tag)}
          />
        ))}

      </div>
    </aside>
  );
}

interface TagButtonProps {
  tag: Tag;
  selected: boolean;
  isDropTarget: boolean;
  onClick: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  className?: string;
  selectedClassName?: string;
}

function TagButton({
  tag, selected, isDropTarget,
  onClick, onDragOver, onDragLeave, onDrop,
  className = 'text-gray-400 hover:text-white hover:bg-surface-700',
  selectedClassName = 'text-accent bg-surface-600',
}: TagButtonProps) {
  const base = isDropTarget
    ? 'text-white bg-accent/20 ring-1 ring-inset ring-accent'
    : selected
    ? selectedClassName
    : className;

  return (
    <button
      onClick={onClick}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`w-full flex items-center justify-between px-4 py-1.5 text-sm transition-colors ${base}`}
    >
      <span className="flex items-center gap-2 truncate">
        <span className="w-1.5 h-1.5 rounded-full bg-accent-dim shrink-0" />
        {tag.name}
      </span>
      {tag.count !== undefined && (
        <span className="text-xs opacity-50 ml-2">{tag.count}</span>
      )}
    </button>
  );
}
