import React, { useState, useEffect, useRef } from 'react';
import { Item } from '../../types';
import { ColorDot } from './ColorDot';

interface DividerRowProps {
  item:         Item;
  dragHandle:   React.ReactNode;
  onSave:       (id: string, title: string) => Promise<void>;
  onDelete:     (id: string) => Promise<void>;
  onColorChange: (color: string | null) => void;
  collapsed:    boolean;
  onToggle:     () => void;
  hiddenCount:  number;
}

export function DividerRow({ item, dragHandle, onSave, onDelete, onColorChange, collapsed, onToggle, hiddenCount }: DividerRowProps) {
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
      <button
        onClick={onToggle}
        className="text-gray-500 hover:text-white transition-colors shrink-0"
        title={collapsed ? 'Expand section' : 'Collapse section'}
      >
        <svg className={`w-3 h-3 transition-transform ${collapsed ? '' : 'rotate-90'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
      <ColorDot color={item.color} onChange={onColorChange} />
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
                  className="text-xs font-bold cursor-pointer hover:text-gray-300 shrink-0 truncate max-w-[60%]"
                  style={{ color: item.color ?? '#ffffff' }}
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
              {collapsed && hiddenCount > 0 && (
                <span className="text-xs text-gray-500 shrink-0">({hiddenCount})</span>
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
