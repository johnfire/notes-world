import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useApp } from "../../context/AppContext";
import { Tag } from "../../types";
import * as api from "../../api";
import { useSortableList } from "../../hooks/useSortableList";
import { PALETTE } from "../../utils/colors";
import { Tooltip } from "../Tooltip";
import { ChangelogPage } from "../../pages/ChangelogPage";

interface SidebarProps {
  onTagSelect: (tag: Tag | null) => void;
  selectedTagId: string | null;
  onTrashSelect: () => void;
  showTrash: boolean;
}

export function Sidebar({
  onTagSelect,
  selectedTagId,
  onTrashSelect,
  showTrash,
}: SidebarProps) {
  const { t } = useTranslation();
  const { state, refresh, loadTags, removeUnsorted } = useApp();
  const [collapsed, setCollapsed] = useState(false);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [changelogOpen, setChangelogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Tag | null>(null);
  const createInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (adding) createInputRef.current?.focus();
  }, [adding]);

  function cancelAdding() {
    setAdding(false);
    setNewName("");
    setCreateError(null);
  }

  async function handleCreateTag(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;
    if (trimmed.length > 100) {
      setCreateError(t("app.sidebar.tagNameTooLong"));
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

  const allSort = useSortableList(state.tags, "tags:all");

  async function handleItemDrop(e: React.DragEvent, toTag: Tag) {
    e.preventDefault();
    setDropTargetId(null);

    const itemId = e.dataTransfer.getData("application/x-item-id");
    const fromTagId = e.dataTransfer.getData("application/x-from-tag-id");
    const fromStaging = e.dataTransfer.getData("application/x-from-staging");
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
    if (!e.dataTransfer.types.includes("application/x-item-id")) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropTargetId(tagId);
  }

  function handleDragLeave(e: React.DragEvent) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDropTargetId(null);
    }
  }

  const handleColorChange = useCallback(
    async (tagId: string, color: string | null) => {
      try {
        await api.tags.setColor(tagId, color);
        await loadTags();
      } catch {
        /* ignore */
      }
    },
    [loadTags],
  );

  const handleRename = useCallback(
    async (tagId: string, name: string) => {
      await api.tags.rename(tagId, name);
      await loadTags();
    },
    [loadTags],
  );

  // Open the delete dialog; the user then picks tag-only vs tag + notes.
  const handleDelete = useCallback(async (tag: Tag) => {
    setDeleteTarget(tag);
  }, []);

  const confirmDelete = useCallback(
    async (deleteItems: boolean) => {
      const tag = deleteTarget;
      if (!tag) return;
      setDeleteTarget(null);
      await api.tags.delete(tag.id, deleteItems);
      if (selectedTagId === tag.id) onTagSelect(null);
      await loadTags();
    },
    [deleteTarget, loadTags, selectedTagId, onTagSelect],
  );

  if (collapsed) {
    return (
      <aside className="w-10 bg-surface-900 border-r border-surface-500 flex flex-col items-center py-3 shrink-0">
        <Tooltip text={t("app.sidebar.expandSidebar")} position="bottom">
          <button
            onClick={() => setCollapsed(false)}
            className="text-gray-500 hover:text-white p-1"
            title={t("app.sidebar.expandSidebar")}
          >
            <svg
              className="w-4 h-4"
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
        </Tooltip>
      </aside>
    );
  }

  function renderTagList() {
    return allSort.orderedItems.map((tag) => (
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
        onRename={handleRename}
        onDelete={handleDelete}
      />
    ));
  }

  return (
    <aside
      className="w-1/4 bg-surface-900 border-r border-surface-500 flex flex-col shrink-0 overflow-hidden"
      data-tour="sidebar"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-500">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            {t("app.sidebar.tags")}
          </span>
          {!adding && (
            <Tooltip text={t("app.sidebar.createTag")} position="bottom">
              <button
                onClick={() => setAdding(true)}
                className="text-gray-500 hover:text-accent transition-colors text-sm leading-none"
                title={t("app.sidebar.createTag")}
              >
                +
              </button>
            </Tooltip>
          )}
        </div>
        <Tooltip text={t("app.sidebar.collapseSidebar")} position="bottom">
          <button
            onClick={() => setCollapsed(true)}
            className="text-gray-500 hover:text-white"
            title={t("app.sidebar.collapseSidebar")}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
        </Tooltip>
      </div>

      {/* Inline tag creation */}
      {adding && (
        <div className="px-3 py-2 border-b border-surface-500">
          <form
            onSubmit={handleCreateTag}
            className="flex items-center gap-1.5"
          >
            <input
              ref={createInputRef}
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") cancelAdding();
              }}
              placeholder={t("app.sidebar.tagNamePlaceholder")}
              maxLength={100}
              className="input text-sm flex-1 min-w-0 px-2 py-1"
              autoComplete="off"
              disabled={saving}
            />
            <button
              type="submit"
              disabled={!newName.trim() || saving}
              className="btn-primary text-xs px-2 py-1"
            >
              {saving ? "…" : t("app.actions.add")}
            </button>
            <button
              type="button"
              onClick={cancelAdding}
              className="btn-ghost text-xs px-1 py-1"
            >
              ✕
            </button>
          </form>
          {createError && (
            <p className="text-xs text-red-400 mt-1">{createError}</p>
          )}
        </div>
      )}

      {/* All items */}
      <div className="flex items-center">
        <button
          onClick={() => onTagSelect(null)}
          className={`flex-1 flex items-center gap-2 px-4 py-2 text-sm transition-colors ${
            selectedTagId === null
              ? "text-white bg-surface-600"
              : "text-gray-400 hover:text-white hover:bg-surface-700"
          }`}
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
          {t("app.sidebar.allItems")}
        </button>
        <Tooltip text={t("app.sidebar.exportUntagged")} position="bottom">
          <button
            onClick={() => (window.location.href = "/api/export/untagged")}
            className="text-gray-600 hover:text-gray-300 transition-colors px-2 py-2 text-xs shrink-0"
            title={t("app.sidebar.exportUntagged")}
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
          </button>
        </Tooltip>
      </div>

      <div className="flex-1 overflow-y-auto">{renderTagList()}</div>

      {/* Docs link */}
      <a
        href="/docs"
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-500 hover:text-white hover:bg-surface-700 transition-colors border-t border-surface-500 shrink-0"
      >
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        {t("app.sidebar.docs")}
      </a>

      {/* What's new */}
      <button
        onClick={() => setChangelogOpen(true)}
        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-500 hover:text-white hover:bg-surface-700 transition-colors border-t border-surface-500 shrink-0"
      >
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
        What's new
      </button>

      {changelogOpen && (
        <ChangelogPage onClose={() => setChangelogOpen(false)} />
      )}

      {/* Trash */}
      <button
        onClick={onTrashSelect}
        className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors border-t border-surface-500 shrink-0 ${
          showTrash
            ? "text-white bg-surface-600"
            : "text-gray-500 hover:text-white hover:bg-surface-700"
        }`}
      >
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
        {t("app.sidebar.trash")}
      </button>

      {deleteTarget && (
        <DeleteTagDialog
          tag={deleteTarget}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={confirmDelete}
        />
      )}
    </aside>
  );
}

// Two distinct deletes, user's choice: drop the tag only (notes keep living,
// just untagged) or drop the tag and send its notes to Trash (recoverable).
function DeleteTagDialog({
  tag,
  onCancel,
  onConfirm,
}: {
  tag: Tag;
  onCancel: () => void;
  onConfirm: (deleteItems: boolean) => Promise<void>;
}) {
  const count = tag.count ?? 0;
  const noteWord = count === 1 ? "note" : "notes";

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="bg-surface-800 border border-surface-500 rounded-lg shadow-2xl w-full max-w-sm">
        <div className="px-5 py-4 border-b border-surface-500">
          <h2 className="text-sm font-semibold text-white">
            Delete tag “{tag.name}”
          </h2>
        </div>

        <div className="p-5 space-y-3">
          <p className="text-xs text-gray-500">
            {count > 0
              ? `This tag is on ${count} ${noteWord}. Choose what to delete.`
              : "This tag has no notes."}
          </p>

          <div className="flex flex-col gap-2">
            <button
              onClick={() => void onConfirm(false)}
              className="w-full text-left px-3 py-2 rounded bg-surface-700 border border-surface-500 hover:bg-surface-600 transition-colors"
            >
              <span className="block text-xs font-semibold text-gray-200">
                Delete tag only
              </span>
              <span className="block text-xs text-gray-500">
                Your notes are kept — they just lose this tag.
              </span>
            </button>

            {count > 0 && (
              <button
                onClick={() => void onConfirm(true)}
                className="w-full text-left px-3 py-2 rounded bg-danger/15 border border-danger/40 hover:bg-danger/25 transition-colors"
              >
                <span className="block text-xs font-semibold text-danger">
                  Delete tag and its {count} {noteWord}
                </span>
                <span className="block text-xs text-danger/80">
                  Notes move to Trash (recoverable).
                </span>
              </button>
            )}
          </div>

          <div className="flex justify-end">
            <button onClick={onCancel} className="btn-ghost text-xs">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

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
  onRename: (tagId: string, newName: string) => Promise<void>;
  onDelete: (tag: Tag) => Promise<void>;
}

function SortableTagRow({
  tag,
  sortable,
  selected,
  isDropTarget,
  onTagSelect,
  onItemDrop,
  onItemDragOver,
  onItemDragLeave,
  onColorChange,
  onRename,
  onDelete,
}: SortableTagRowProps) {
  const { t } = useTranslation();
  const dragAllowed = useRef(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(tag.name);
  const [renameError, setRenameError] = useState<string | null>(null);
  const editRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) editRef.current?.select();
  }, [editing]);

  async function handleRenameSubmit() {
    const trimmed = editName.trim();
    if (!trimmed || trimmed === tag.name) {
      setEditing(false);
      setRenameError(null);
      return;
    }
    if (trimmed.length > 100) {
      setRenameError(t("app.sidebar.tagNameTooLong"));
      return;
    }
    try {
      await onRename(tag.id, trimmed);
      setEditing(false);
      setRenameError(null);
    } catch (err) {
      setRenameError((err as Error).message);
    }
  }

  useEffect(() => {
    if (!showColorPicker) return;
    function handleClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowColorPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showColorPicker]);

  const tagColor = tag.color;
  const hasColor = !!tagColor;

  const base = isDropTarget
    ? "text-white bg-accent/20 ring-1 ring-inset ring-accent"
    : selected
      ? hasColor
        ? "bg-surface-600"
        : "text-accent bg-surface-600"
      : hasColor
        ? "hover:bg-surface-700"
        : "text-gray-400 hover:text-white hover:bg-surface-700";

  const { dragHandleProps, dropZoneProps } = sortable;
  const { onDragStart, onDragEnd } = dragHandleProps(tag.id);
  const {
    onDragOver: sortableDragOver,
    onDragLeave: sortableDragLeave,
    onDrop: sortableDrop,
  } = dropZoneProps(tag.id);

  return (
    <div
      draggable
      onDragStart={(e) => {
        if (!dragAllowed.current) {
          e.preventDefault();
          return;
        }
        onDragStart(e);
      }}
      onDragEnd={(e) => {
        dragAllowed.current = false;
        onDragEnd(e);
      }}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("application/x-item-id")) {
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
        if (e.dataTransfer.types.includes("application/x-item-id")) {
          void onItemDrop(e, tag);
        } else {
          sortableDrop(e);
        }
      }}
      className={[
        "w-full flex items-center text-sm transition-colors relative group",
        base,
        sortable.dragId === tag.id ? "opacity-40 scale-[0.98]" : "",
        sortable.dragOverId === tag.id ? "border-t-2 border-accent" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={hasColor ? { color: tagColor } : undefined}
    >
      {/* Grip handle */}
      <div
        onMouseDown={() => {
          dragAllowed.current = true;
        }}
        onMouseUp={() => {
          dragAllowed.current = false;
        }}
        onClick={(e) => e.stopPropagation()}
        className="cursor-grab active:cursor-grabbing px-1.5 py-1.5 text-gray-600 hover:text-gray-400 shrink-0"
        title={t("app.sidebar.dragToReorder")}
      >
        <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="9" cy="5" r="1.5" />
          <circle cx="15" cy="5" r="1.5" />
          <circle cx="9" cy="12" r="1.5" />
          <circle cx="15" cy="12" r="1.5" />
          <circle cx="9" cy="19" r="1.5" />
          <circle cx="15" cy="19" r="1.5" />
        </svg>
      </div>

      {/* Color dot */}
      <div className="relative shrink-0" ref={pickerRef}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowColorPicker(!showColorPicker);
          }}
          className="w-3 h-3 rounded-full border border-gray-600 hover:border-gray-400 transition-colors"
          style={{
            backgroundColor: tagColor ?? "var(--color-accent-dim, #4b5563)",
          }}
          title={t("app.sidebar.setColor")}
        />
        {showColorPicker && (
          <div className="absolute left-0 top-full mt-1 z-50 bg-surface-800 border border-surface-500 rounded-lg p-2 shadow-xl grid grid-cols-4 gap-1.5 w-[120px]">
            {PALETTE.map((c) => (
              <button
                key={c.value}
                onClick={(e) => {
                  e.stopPropagation();
                  onColorChange(tag.id, c.value);
                  setShowColorPicker(false);
                }}
                className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-125 ${
                  tagColor === c.value
                    ? "border-white scale-110"
                    : "border-transparent"
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
                {t("app.sidebar.removeColor")}
              </button>
            )}
          </div>
        )}
      </div>

      {editing ? (
        <div className="flex-1 flex items-center pr-3 py-0.5 pl-2 min-w-0">
          <input
            ref={editRef}
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleRenameSubmit();
              if (e.key === "Escape") {
                setEditing(false);
                setEditName(tag.name);
                setRenameError(null);
              }
            }}
            onBlur={() => void handleRenameSubmit()}
            maxLength={100}
            className="bg-surface-700 text-white text-sm rounded px-1 py-0.5 w-full outline-none ring-1 ring-accent"
          />
          {renameError && (
            <span className="text-xs text-red-400 ml-1 shrink-0">
              {renameError}
            </span>
          )}
        </div>
      ) : (
        <button
          onClick={() => onTagSelect(tag)}
          onDoubleClick={(e) => {
            e.stopPropagation();
            setEditName(tag.name);
            setEditing(true);
          }}
          className="flex-1 flex items-center justify-between pr-3 py-1.5 pl-2 min-w-0"
        >
          <span className="truncate">{tag.name}</span>
          {tag.count !== undefined && (
            <span className="text-xs opacity-50 ml-2 group-hover:hidden">
              {tag.count}
            </span>
          )}
        </button>
      )}
      {!editing && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            void onDelete(tag);
          }}
          className="hidden group-hover:block text-gray-600 hover:text-red-400 transition-colors pr-3 shrink-0"
          title="Delete tag"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-3.5 h-3.5"
          >
            <path
              fillRule="evenodd"
              d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 3.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
