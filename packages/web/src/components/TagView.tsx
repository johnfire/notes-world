import React, { useEffect, useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Tag, Item, ItemType } from "../types";
import {
  sortItemsByDate,
  sortItemsByStatus,
  dateOf,
  isOverdue,
  formatDueShort,
  type DateField,
} from "@notes-world/shared";
import * as api from "../api";
import { useApp } from "../context/AppContext";
import { SortableList } from "./SortableList";
import { linkify } from "../utils/linkify";
import { ColorDot } from "./tag-view/ColorDot";
import { DividerRow } from "./tag-view/DividerRow";

interface Props {
  tag: Tag;
}

export function TagView({ tag }: Props) {
  const { t } = useTranslation();
  const {
    openItem,
    state: { refreshKey, unsortedItems },
    removeUnsorted,
    loadTags,
  } = useApp();
  const [items, setItems] = useState<Item[]>([]);
  const [visualOrder, setVisualOrder] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [collapsedSet, setCollapsedSet] = useState<Set<string>>(new Set());
  // Bumped after a one-shot date sort to remount SortableList so it reloads the
  // freshly-saved order. Manual drag remains fully available afterwards.
  const [sortNonce, setSortNonce] = useState(0);

  const prevTagId = useRef(tag.id);

  useEffect(() => {
    const isTagChange = tag.id !== prevTagId.current;
    prevTagId.current = tag.id;
    setLoading(true);
    Promise.all([
      api.tags.getItemsForTag(tag.id, 500),
      api.collapsedDividers.get(tag.id),
    ])
      .then(([fetchedItems, collapsed]) => {
        setItems(fetchedItems);
        if (isTagChange) setVisualOrder(fetchedItems);
        setCollapsedSet(new Set(collapsed));
      })
      .finally(() => setLoading(false));
  }, [tag.id, refreshKey]);

  const handleReorder = useCallback((ordered: Item[]) => {
    setVisualOrder(ordered);
  }, []);

  function toggleCollapse(dividerId: string) {
    setCollapsedSet((prev) => {
      const next = new Set(prev);
      if (next.has(dividerId)) next.delete(dividerId);
      else next.add(dividerId);
      void api.collapsedDividers.save(tag.id, Array.from(next));
      return next;
    });
  }

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
    setItems((prev) => [...prev, divider]);
  }

  async function handleSaveDivider(id: string, title: string) {
    const updated = await api.items.update(id, { title });
    setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
  }

  async function handleDeleteDivider(id: string) {
    await api.items.archive(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  async function handleArchiveItem(id: string) {
    await api.items.archive(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    void loadTags();
  }

  async function handleColorChange(id: string, color: string | null) {
    const updated = await api.items.update(id, { color });
    setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
  }

  const unsortedIds = new Set(unsortedItems.map((i) => i.id));
  const stagedItems = items.filter((i) => unsortedIds.has(i.id));
  const sortedItems = items.filter((i) => !unsortedIds.has(i.id));

  // One-shot: rearrange the list once and persist it as the normal saved order.
  // Drag stays available after. Used for the date and status quick-sorts.
  async function applySort(ordered: Item[], context: string) {
    setVisualOrder(ordered);
    try {
      await api.sortOrders.save(
        `tag:${tag.id}`,
        ordered.map((i) => i.id),
      );
    } catch (err) {
      api.reportClientError({
        message: (err as Error).message,
        stack: (err as Error).stack,
        context,
      });
    }
    setSortNonce((n) => n + 1);
  }

  function sortByDate(field: DateField) {
    return applySort(sortItemsByDate(sortedItems, field), "TagView.sortByDate");
  }

  function sortByStatus() {
    return applySort(sortItemsByStatus(sortedItems), "TagView.sortByStatus");
  }

  const handleExternalDrop = useCallback(
    (itemId: string) => {
      removeUnsorted(itemId);
    },
    [removeUnsorted],
  );

  function handleStageDragStart(e: React.DragEvent, item: Item) {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", item.id);
    e.dataTransfer.setData("application/x-item-id", item.id);
    e.dataTransfer.setData("application/x-from-tag-id", tag.id);
    e.dataTransfer.setData("application/x-from-staging", "1");
  }

  const itemCount = sortedItems.filter(
    (i) => i.item_type !== ItemType.Divider,
  ).length;

  return (
    <div className="p-4 h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          {tag.name}
          {!loading && (
            <span className="ml-2 text-gray-600 normal-case font-normal">
              {t("app.tagView.itemCount", { count: itemCount })}
            </span>
          )}
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-600">{t("app.tagView.sortBy")}</span>
          <button
            onClick={() => void sortByDate("due_date")}
            className="text-xs text-accent/80 hover:text-accent transition-colors px-2 py-1 rounded hover:bg-surface-600"
            title={`${t("app.tagView.sortBy")} ${t("app.drawer.dueDate")}`}
          >
            {t("app.drawer.dueDate")}
          </button>
          <button
            onClick={() => void sortByDate("start_date")}
            className="text-xs text-accent/80 hover:text-accent transition-colors px-2 py-1 rounded hover:bg-surface-600"
            title={`${t("app.tagView.sortBy")} ${t("app.drawer.startDate")}`}
          >
            {t("app.drawer.startDate")}
          </button>
          <button
            onClick={() => void sortByStatus()}
            className="text-xs text-accent/80 hover:text-accent transition-colors px-2 py-1 rounded hover:bg-surface-600"
            title={`${t("app.tagView.sortBy")} ${t("app.drawer.status")}`}
          >
            {t("app.drawer.status")}
          </button>
          <span className="text-surface-500">|</span>
          <button
            onClick={() => (window.location.href = `/api/export/tag/${tag.id}`)}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors px-2 py-1 rounded hover:bg-surface-600"
            title="Export as markdown"
          >
            {t("app.actions.export")}
          </button>
          <button
            onClick={handleAddDivider}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors px-2 py-1 rounded hover:bg-surface-600"
          >
            {t("app.tagView.addDivider")}
          </button>
        </div>
      </div>

      {/* Staging area */}
      {stagedItems.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
            {t("app.tagView.unsorted", { count: stagedItems.length })}
          </p>
          <div className="flex flex-col gap-1.5">
            {stagedItems.map((item) => (
              <div
                key={item.id}
                draggable
                onDragStart={(e) => handleStageDragStart(e, item)}
                className="card bg-surface-700 border-dashed border-accent/40 hover:border-accent py-2 px-3 flex items-center gap-2 cursor-grab active:cursor-grabbing transition-colors"
              >
                <svg
                  className="w-4 h-4 text-gray-600 shrink-0"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <circle cx="9" cy="5" r="1.5" />
                  <circle cx="15" cy="5" r="1.5" />
                  <circle cx="9" cy="12" r="1.5" />
                  <circle cx="15" cy="12" r="1.5" />
                  <circle cx="9" cy="19" r="1.5" />
                  <circle cx="15" cy="19" r="1.5" />
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
                  title={t("app.tagView.placeAtEnd")}
                >
                  ↓
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-600 py-8 text-center">
          {t("app.actions.loading")}
        </p>
      ) : sortedItems.length === 0 && stagedItems.length === 0 ? (
        <p className="text-sm text-gray-600 py-8 text-center">
          {t("app.tagView.noItems")}
        </p>
      ) : (
        <SortableList
          key={`${tag.id}:${sortNonce}`}
          items={sortedItems}
          contextKey={`tag:${tag.id}`}
          onReorder={handleReorder}
          onExternalDrop={handleExternalDrop}
          extraDragData={(item) =>
            item.item_type !== ItemType.Divider
              ? [
                  { type: "application/x-item-id", value: item.id },
                  { type: "application/x-from-tag-id", value: tag.id },
                ]
              : []
          }
          className="flex flex-col gap-2"
          renderItem={(item, dragHandle) => {
            if (item.item_type === ItemType.Divider) {
              return (
                <DividerRow
                  item={item}
                  dragHandle={dragHandle}
                  onSave={handleSaveDivider}
                  onDelete={handleDeleteDivider}
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
                <ColorDot
                  color={item.color}
                  onChange={(c) => handleColorChange(item.id, c)}
                />
                <button
                  onClick={() => openItem(item.id)}
                  className="flex-1 text-left min-w-0"
                >
                  <p
                    className="text-sm"
                    style={item.color ? { color: item.color } : undefined}
                  >
                    {(() => {
                      const due = dateOf(item, "due_date");
                      if (!due) return null;
                      return (
                        <span
                          className={`font-semibold ${isOverdue(due) ? "text-red-400" : "text-accent"}`}
                        >
                          {formatDueShort(due)}{" "}
                        </span>
                      );
                    })()}
                    {item.title}
                  </p>
                  {item.body && (
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                      {linkify(item.body)}
                    </p>
                  )}
                </button>
                <button
                  onClick={() => handleArchiveItem(item.id)}
                  className="text-gray-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                  title="Move to trash"
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
              </div>
            );
          }}
        />
      )}
    </div>
  );
}
