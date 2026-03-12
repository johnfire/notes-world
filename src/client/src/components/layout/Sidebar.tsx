import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Tag } from '../../types';

interface SidebarProps {
  onTagSelect: (tag: Tag | null) => void;
  selectedTagId: string | null;
}

export function Sidebar({ onTagSelect, selectedTagId }: SidebarProps) {
  const { state } = useApp();
  const [collapsed, setCollapsed] = useState(false);

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
      {/* Sidebar header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-500">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Tags</span>
        <button
          onClick={() => setCollapsed(true)}
          className="text-gray-500 hover:text-white"
          title="Collapse sidebar"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* All items button */}
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

      {/* Tag list */}
      <div className="flex-1 overflow-y-auto py-1">
        {state.tags.length === 0 ? (
          <p className="px-4 py-3 text-xs text-gray-600">No tags yet</p>
        ) : (
          state.tags.map((tag) => (
            <button
              key={tag.id}
              onClick={() => onTagSelect(tag)}
              className={`w-full flex items-center justify-between px-4 py-1.5 text-sm transition-colors ${
                selectedTagId === tag.id
                  ? 'text-accent bg-surface-600'
                  : 'text-gray-400 hover:text-white hover:bg-surface-700'
              }`}
            >
              <span className="flex items-center gap-2 truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-dim shrink-0" />
                {tag.name}
              </span>
              {tag.count !== undefined && (
                <span className="text-xs text-gray-600 ml-2">{tag.count}</span>
              )}
            </button>
          ))
        )}
      </div>
    </aside>
  );
}
