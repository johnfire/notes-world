import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Item, ItemType } from "../types";
import { selectCompletedItems, formatDueShort } from "@notes-world/shared";
import * as api from "../api";
import { useApp } from "../context/AppContext";

// The Done view: a single place listing every completed item across all tags and
// untagged. It is a virtual filter on completion status — NOT a literal "done"
// tag — so nothing is ever moved or retagged. Completion lives only on tasks, so
// this fetches tasks and keeps the ones whose status is Done.
export function DoneView() {
  const { t } = useTranslation();
  const { openItem, state } = useApp();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      // The server caps a page at 200, so page through every task to be sure no
      // completed item is missed (the Done view must never "lose" one). The page
      // cap is a safety stop against a runaway loop.
      const PAGE = 200;
      const MAX_PAGES = 50;
      const tasks: Item[] = [];
      for (let p = 0; p < MAX_PAGES; p++) {
        const batch = await api.items.byType(ItemType.Task, PAGE, p * PAGE);
        tasks.push(...batch);
        if (batch.length < PAGE) break;
      }
      // selectCompletedItems is defensive: a malformed item is skipped, never
      // throws, so one bad row can't blank the whole list.
      setItems(selectCompletedItems(tasks));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // Reload when the app's refreshKey bumps (e.g. a task was just completed).
  useEffect(() => {
    void load();
  }, [load, state.refreshKey]);

  return (
    <div className="p-4 overflow-y-auto h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          {t("app.views.done")}
          {!loading && !error && (
            <span className="ml-2 text-gray-600 normal-case font-normal">
              {t("app.doneView.count", { count: items.length })}
            </span>
          )}
        </h2>
      </div>

      {loading ? (
        <p className="text-sm text-gray-600 py-8 text-center">
          {t("app.actions.loading")}
        </p>
      ) : error ? (
        <p className="text-sm text-gray-600 py-8 text-center">
          {t("app.doneView.error")}
        </p>
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-600 py-8 text-center">
          {t("app.doneView.empty")}
        </p>
      ) : (
        <div className="space-y-1">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => openItem(item.id)}
              className="w-full text-left card hover:border-surface-400 hover:bg-surface-600 transition-colors"
            >
              <p className="text-sm text-gray-200">{item.title}</p>
              {item.body && (
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                  {item.body}
                </p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-green-400">
                  {t("app.status.done")}
                </span>
                <CompletedOn item={item} />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// The completion date, shown compactly. A missing/garbage completed_at simply
// renders nothing rather than breaking the row.
function CompletedOn({ item }: { item: Item }) {
  const raw = (item.type_data as { completed_at?: unknown } | null | undefined)
    ?.completed_at;
  if (typeof raw !== "string") return null;
  const label = formatDueShort(raw);
  if (!label) return null;
  return (
    <>
      <span className="text-xs text-gray-700">·</span>
      <span className="text-xs text-gray-600">{label}</span>
    </>
  );
}
