import { useTranslation } from "react-i18next";
import {
  droppedFieldsOnTypeChange,
  type DroppedTypeField,
} from "@notes-world/shared";
import { ItemType, ItemStatus, type Item } from "../types";
import { linkify } from "../utils/linkify";
import { ItemTypeBadge } from "./ItemTypeBadge";

// Type-specific fields the user can lose when converting → i18n label keys.
const FIELD_LABEL: Record<DroppedTypeField, string> = {
  status: "app.drawer.status",
  priority: "app.drawer.priority",
  dueDate: "app.drawer.dueDate",
  startDate: "app.drawer.startDate",
  maturity: "app.drawer.maturity",
  remindAt: "app.drawer.remindAt",
};

// Real types a user can convert between; Untyped/Divider are never targets.
const CONVERT_TARGETS = [
  ItemType.Task,
  ItemType.Idea,
  ItemType.Note,
  ItemType.Reminder,
];
import { useItemDrawer } from "./drawer/useItemDrawer";
import { TagPicker } from "./drawer/TagPicker";
import { TaskFields } from "./drawer/TaskFields";
import { DependenciesPanel } from "./drawer/DependenciesPanel";

export function ItemDrawer() {
  const { t } = useTranslation();
  const d = useItemDrawer();

  if (!d.selectedItemId) return null;

  const { item, loading } = d;
  const isArchived = item?.status === ItemStatus.Archived;

  // What a type change would discard from this item (empty = lossless).
  const lostFields = item ? droppedFieldsOnTypeChange(item) : [];
  const lostLabels = lostFields.map((f) => t(FIELD_LABEL[f])).join(", ");

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={d.closeItem} />

      {/* Drawer */}
      <aside className="fixed right-0 top-0 h-full w-96 max-w-full bg-surface-800 border-l border-surface-500 z-50 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-surface-500 shrink-0">
          {!loading && item && (
            <>
              <ItemTypeBadge type={item.item_type} />
              {isArchived && (
                <span className="badge bg-surface-500 text-gray-500">
                  {t("app.drawer.archived")}
                </span>
              )}
            </>
          )}
          <div className="flex-1" />
          {d.saving && (
            <span className="text-xs text-gray-600">
              {t("app.actions.saving")}
            </span>
          )}
          <button
            onClick={d.closeItem}
            className="text-gray-500 hover:text-white"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Body */}
        {loading ? (
          <div className="flex-1 p-5 space-y-4">
            <div className="h-7 w-3/4 bg-surface-600 rounded animate-pulse" />
            <div className="h-4 w-full bg-surface-600 rounded animate-pulse" />
            <div className="h-4 w-2/3 bg-surface-600 rounded animate-pulse" />
          </div>
        ) : item ? (
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Title */}
            <input
              className="w-full bg-transparent text-lg font-semibold text-white border-0 border-b border-transparent focus:border-accent focus:outline-none pb-1 transition-colors disabled:opacity-60"
              value={d.title}
              onChange={(e) => d.setTitle(e.target.value)}
              onBlur={() => void d.saveTitle()}
              disabled={isArchived || d.saving}
            />

            {/* Body */}
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 block">
                {t("app.drawer.notes")}
              </label>
              <textarea
                className="w-full bg-surface-700 border border-surface-500 rounded-md px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-accent resize-none disabled:opacity-60"
                rows={4}
                value={d.body}
                onChange={(e) => d.setBody(e.target.value)}
                onBlur={() => void d.saveBody()}
                placeholder={t("app.drawer.addNotes")}
                disabled={isArchived || d.saving}
              />
              {d.body && (
                <p className="text-sm text-gray-400 mt-1.5 whitespace-pre-wrap break-all">
                  {linkify(d.body)}
                </p>
              )}
            </div>

            {/* Due / start dates (editable) — available on any item except dividers */}
            {item.item_type !== ItemType.Divider && (
              <TaskDates
                item={item}
                isArchived={!!isArchived}
                onSaveDate={d.saveDate}
              />
            )}

            {/* Status / priority (editable, tasks only) */}
            <TaskFields
              item={item}
              isArchived={!!isArchived}
              saving={d.saving}
              onSave={d.saveTaskField}
            />

            {/* Type data */}
            {item.type_data && <TypeDataPanel item={item} />}

            {/* Dependencies */}
            {(d.deps.length > 0 ||
              d.dependents.length > 0 ||
              item.item_type === ItemType.Task) && (
              <DependenciesPanel
                item={item}
                deps={d.deps}
                dependents={d.dependents}
                depItems={d.depItems}
                depSearch={d.depSearch}
                depSearchResults={d.depSearchResults}
                isArchived={isArchived!}
                onOpenItem={d.openItem}
                onRemoveDep={d.handleRemoveDep}
                onAddDep={d.handleAddDep}
                onDepSearch={d.handleDepSearch}
              />
            )}

            {/* Tags */}
            <TagPicker
              itemTags={d.itemTags}
              allTags={d.allTags}
              tagSearch={d.tagSearch}
              setTagSearch={d.setTagSearch}
              tagPickerOpen={d.tagPickerOpen}
              setTagPickerOpen={d.setTagPickerOpen}
              isArchived={isArchived!}
              onAddTag={d.handleAddTag}
              onCreateAndAddTag={d.handleCreateAndAddTag}
              onRemoveTag={d.handleRemoveTag}
            />

            {/* Meta */}
            <div className="text-xs text-gray-600 space-y-1 pt-2 border-t border-surface-600">
              <div>
                {t("app.drawer.created")}{" "}
                {new Date(item.created_at).toLocaleString()}
              </div>
              <div>
                {t("app.drawer.updated")}{" "}
                {new Date(item.updated_at).toLocaleString()}
              </div>
            </div>
          </div>
        ) : null}

        {/* Footer */}
        {item && !loading && (
          <div className="px-5 py-3 border-t border-surface-500 flex items-center gap-2 shrink-0">
            {!isArchived && item.item_type !== ItemType.Divider && (
              <div className="relative">
                <button
                  onClick={() => {
                    d.setPendingType(null);
                    d.setPromoteOpen((p) => !p);
                  }}
                  className="btn-ghost text-xs"
                >
                  {t("app.drawer.changeType")}
                </button>
                {d.promoteOpen && (
                  <div className="absolute bottom-10 left-0 z-10 w-60 bg-surface-700 border border-surface-500 rounded-md shadow-xl overflow-hidden">
                    {d.pendingType ? (
                      <div className="p-3 space-y-2.5">
                        <p className="text-xs text-gray-300 leading-relaxed">
                          {t("app.drawer.changeTypeConfirm", {
                            type: t(`app.types.${d.pendingType.toLowerCase()}`),
                            details: lostLabels,
                          })}
                        </p>
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => d.setPendingType(null)}
                            className="btn-ghost text-xs text-gray-400"
                          >
                            {t("app.actions.cancel")}
                          </button>
                          <button
                            onClick={() => void d.handlePromote(d.pendingType!)}
                            className="btn-ghost text-xs text-accent"
                          >
                            {t("app.drawer.convert")}
                          </button>
                        </div>
                      </div>
                    ) : (
                      CONVERT_TARGETS.filter(
                        (type) => type !== item.item_type,
                      ).map((type) => (
                        <button
                          key={type}
                          onClick={() => {
                            if (lostFields.length === 0)
                              void d.handlePromote(type);
                            else d.setPendingType(type);
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-surface-600 hover:text-white"
                        >
                          {t(`app.types.${type.toLowerCase()}`)}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex-1" />

            {isArchived ? (
              <button
                onClick={() => void d.handleRestore()}
                className="btn-ghost text-xs text-accent"
              >
                {t("app.actions.restore")}
              </button>
            ) : (
              <button
                onClick={() => void d.handleArchive()}
                className="btn-ghost text-xs text-gray-500 hover:text-danger"
              >
                {t("app.actions.archive")}
              </button>
            )}
          </div>
        )}
      </aside>
    </>
  );
}

function TaskDates({
  item,
  isArchived,
  onSaveDate,
}: {
  item: Item;
  isArchived: boolean;
  onSaveDate: (field: "due_date" | "start_date", value: string) => Promise<void>;
}) {
  const { t } = useTranslation();
  const td = item.type_data as Record<string, string | undefined> | null;
  // <input type="date"> needs YYYY-MM-DD; tolerate stored full-ISO values.
  const due = (td?.due_date ?? "").slice(0, 10);
  const start = (td?.start_date ?? "").slice(0, 10);
  const inputCls =
    "bg-surface-700 border border-surface-500 rounded-md px-2 py-1.5 text-sm text-gray-200 [color-scheme:dark] focus:outline-none focus:border-accent disabled:opacity-60";

  return (
    <div className="grid grid-cols-2 gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-xs text-gray-500 uppercase tracking-wider">
          {t("app.drawer.dueDate")}
        </span>
        <input
          type="date"
          value={due}
          disabled={isArchived}
          onChange={(e) => void onSaveDate("due_date", e.target.value)}
          className={inputCls}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-gray-500 uppercase tracking-wider">
          {t("app.drawer.startDate")}
        </span>
        <input
          type="date"
          value={start}
          disabled={isArchived}
          onChange={(e) => void onSaveDate("start_date", e.target.value)}
          className={inputCls}
        />
      </label>
    </div>
  );
}

function TypeDataPanel({ item }: { item: import("../types").Item }) {
  const { t } = useTranslation();
  const td = item.type_data as Record<string, string | undefined> | null;
  if (!td) return null;

  const rows: Array<[string, string | undefined]> = [];

  if (item.item_type === ItemType.Task) {
    // Status & priority are edited above (TaskFields); only show completion here.
    if (td.completed_at)
      rows.push([
        t("app.drawer.completed"),
        new Date(td.completed_at).toLocaleDateString(),
      ]);
  } else if (item.item_type === ItemType.Idea) {
    rows.push([t("app.drawer.maturity"), td.maturity]);
  } else if (item.item_type === ItemType.Reminder) {
    if (td.remind_at)
      rows.push([
        t("app.drawer.remindAt"),
        new Date(td.remind_at).toLocaleString(),
      ]);
    rows.push([
      t("app.drawer.dismissed"),
      td.is_dismissed === "true" ? t("app.drawer.yes") : t("app.drawer.no"),
    ]);
  }

  if (rows.length === 0) return null;

  return (
    <div className="bg-surface-700 rounded-md p-3 space-y-1.5">
      {rows.map(([label, value]) => (
        <div key={label} className="flex gap-3 text-xs">
          <span className="text-gray-500 w-20 shrink-0">{label}</span>
          <span className="text-gray-300">{value ?? "—"}</span>
        </div>
      ))}
    </div>
  );
}
