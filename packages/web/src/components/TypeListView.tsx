import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Item, ItemType } from "../types";
import * as api from "../api";
import { useApp } from "../context/AppContext";
import { linkify } from "../utils/linkify";

// Flat list of every active item of a single type — used by the Notes and
// Untyped view tabs, which don't need the Kanban grouping of Ideas/Tasks.
export function TypeListView({ type }: { type: ItemType }) {
  const { t } = useTranslation();
  const { openItem, loadTags, state } = useApp();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await api.items.byType(type, 500));
    } finally {
      setLoading(false);
    }
  }, [type]);

  // Reload on mount, on type change, and whenever the app signals a data change
  // (e.g. an item captured or promoted into this type elsewhere).
  useEffect(() => {
    void load();
  }, [load, state.refreshKey]);

  async function handleArchive(id: string) {
    await api.items.archive(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    void loadTags();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-gray-600">{t("app.typeView.empty")}</p>
      </div>
    );
  }

  return (
    <div className="p-4 overflow-y-auto h-full space-y-1">
      {items.map((item) => (
        <div
          key={item.id}
          className="card hover:border-surface-400 hover:bg-surface-600 transition-colors py-2 px-3 flex items-center gap-2 group"
        >
          <button
            onClick={() => openItem(item.id)}
            className="flex-1 text-left min-w-0"
          >
            <p
              className="text-sm"
              style={item.color ? { color: item.color } : undefined}
            >
              {item.title}
            </p>
            {item.body && (
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                {linkify(item.body)}
              </p>
            )}
          </button>
          <button
            onClick={() => void handleArchive(item.id)}
            className="text-gray-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
            title={t("app.actions.archive")}
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
      ))}
    </div>
  );
}
