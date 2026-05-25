import { useTranslation } from "react-i18next";
import { TaskStatus } from "../../types";

interface TaskActionsProps {
  taskStatus: TaskStatus | undefined;
  actioning: boolean;
  onAction: (action: "complete" | "start" | "block") => void;
}

export function TaskActions({
  taskStatus,
  actioning,
  onAction,
}: TaskActionsProps) {
  const { t } = useTranslation();
  return (
    <div>
      <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">
        {t("app.taskActions.label")}
      </label>
      {taskStatus === TaskStatus.Open && (
        <div className="flex gap-2 flex-wrap">
          <button
            className="btn-ghost text-xs"
            disabled={actioning}
            onClick={() => void onAction("start")}
          >
            {t("app.taskActions.start")}
          </button>
          <button
            className="btn-ghost text-xs"
            disabled={actioning}
            onClick={() => void onAction("complete")}
          >
            {t("app.taskActions.complete")}
          </button>
        </div>
      )}
      {taskStatus === TaskStatus.InProgress && (
        <div className="flex gap-2 flex-wrap">
          <button
            className="btn-ghost text-xs"
            disabled={actioning}
            onClick={() => void onAction("complete")}
          >
            {t("app.taskActions.complete")}
          </button>
          <button
            className="btn-ghost text-xs"
            disabled={actioning}
            onClick={() => void onAction("block")}
          >
            {t("app.taskActions.block")}
          </button>
        </div>
      )}
      {taskStatus === TaskStatus.Blocked && (
        <p className="text-xs text-gray-600 italic">
          {t("app.taskActions.removeDepToUnblock")}
        </p>
      )}
    </div>
  );
}
