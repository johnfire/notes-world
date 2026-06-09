import React, { useState, useEffect, useRef } from "react";
import { Item } from "../../types";

interface DividerRowProps {
  item: Item;
  dragHandle: React.ReactNode;
  onSave: (id: string, title: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  collapsed: boolean;
  onToggle: () => void;
  hiddenCount: number;
}

export function DividerRow({
  item,
  dragHandle,
  onSave,
  onDelete,
  collapsed,
  onToggle,
  hiddenCount,
}: DividerRowProps) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(item.title);
  const inputRef = useRef<HTMLInputElement>(null);
  const committingRef = useRef(false);

  useEffect(() => {
    setLabel(item.title);
  }, [item.title]);
  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

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
    <div className="bg-black rounded-lg py-2 px-3 flex items-center gap-2">
      {dragHandle}
      <button
        onClick={onToggle}
        className="text-gray-400 hover:text-white transition-colors shrink-0"
        title={collapsed ? "Expand section" : "Collapse section"}
      >
        <svg
          className={`w-3 h-3 transition-transform ${collapsed ? "" : "rotate-90"}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </button>
      <div className="flex-1 flex items-center gap-2 min-w-0">
        {editing ? (
          <input
            ref={inputRef}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") {
                setEditing(false);
                setLabel(item.title);
              }
            }}
            className="flex-1 bg-transparent border-b border-gray-600 text-xs text-white outline-none"
            placeholder="Label (optional)"
          />
        ) : (
          <>
            {item.title ? (
              <span
                onClick={startEdit}
                className="flex-1 text-xs font-bold text-white cursor-pointer truncate min-w-0"
              >
                {item.title}
              </span>
            ) : (
              <span
                onClick={startEdit}
                className="flex-1 text-xs text-gray-500 cursor-pointer hover:text-gray-300"
              >
                label
              </span>
            )}
            {collapsed && hiddenCount > 0 && (
              <span className="text-xs text-gray-400 shrink-0">
                ({hiddenCount})
              </span>
            )}
            <button
              onClick={() => onDelete(item.id)}
              className="text-gray-400 hover:text-red-400 transition-colors shrink-0"
              title="Remove divider"
              aria-label="Remove divider"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                className="w-4 h-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 6l12 12M18 6L6 18"
                />
              </svg>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
