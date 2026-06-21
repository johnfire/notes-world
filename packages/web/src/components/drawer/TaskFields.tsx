import { useTranslation } from "react-i18next";
import { ItemType, TaskStatus, Priority, type Item } from "../../types";

interface TaskFieldsProps {
  item: Item;
  isArchived: boolean;
  saving: boolean;
  onSave: (patch: Record<string, string | null>) => Promise<void>;
}

const selectCls =
  "bg-surface-700 border border-surface-500 rounded-md px-2 py-1.5 text-sm text-gray-200 [color-scheme:dark] focus:outline-none focus:border-accent disabled:opacity-60";

// Map the raw status value to its i18n label so the dropdown reads "In Progress"
// / "On Hold" rather than the bare enum value.
const STATUS_LABEL_KEY: Record<string, string> = {
  Open: "app.status.open",
  InProgress: "app.status.inProgress",
  OnHold: "app.status.onHold",
  Blocked: "app.status.blocked",
  Done: "app.status.done",
};

// Editable status + priority for tasks. Both write straight into type_data;
// picking Done stamps completed_at, any other status clears it.
export function TaskFields({
  item,
  isArchived,
  saving,
  onSave,
}: TaskFieldsProps) {
  const { t } = useTranslation();
  if (item.item_type !== ItemType.Task) return null;

  const td = item.type_data as {
    task_status?: string;
    priority?: string;
  } | null;
  const status = td?.task_status ?? TaskStatus.Open;
  const priority = td?.priority ?? Priority.Normal;

  function changeStatus(value: string) {
    void onSave({
      task_status: value,
      completed_at:
        value === TaskStatus.Done ? new Date().toISOString() : null,
    });
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-xs text-gray-500 uppercase tracking-wider">
          {t("app.drawer.status")}
        </span>
        <select
          value={status}
          disabled={isArchived || saving}
          onChange={(e) => changeStatus(e.target.value)}
          className={selectCls}
        >
          {Object.values(TaskStatus).map((s) => (
            <option key={s} value={s}>
              {t(STATUS_LABEL_KEY[s] ?? s)}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-gray-500 uppercase tracking-wider">
          {t("app.drawer.priority")}
        </span>
        <select
          value={priority}
          disabled={isArchived || saving}
          onChange={(e) => void onSave({ priority: e.target.value })}
          className={selectCls}
        >
          {Object.values(Priority).map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
