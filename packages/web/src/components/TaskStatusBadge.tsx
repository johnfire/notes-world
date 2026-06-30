import { useTranslation } from "react-i18next";
import { TaskStatus } from "../types";
import { isTaskStatus } from "../utils/taskStatus";

const STATUS_CLASS: Record<TaskStatus, string> = {
  [TaskStatus.InProgress]: "badge-status-inprogress",
  [TaskStatus.Blocked]: "badge-status-blocked",
  [TaskStatus.OnHold]: "badge-status-onhold",
  [TaskStatus.Open]: "badge-status-open",
  [TaskStatus.Done]: "badge-status-done",
};

const STATUS_KEY: Record<TaskStatus, string> = {
  [TaskStatus.Open]: "app.status.open",
  [TaskStatus.InProgress]: "app.status.inProgress",
  [TaskStatus.OnHold]: "app.status.onHold",
  [TaskStatus.Blocked]: "app.status.blocked",
  [TaskStatus.Done]: "app.status.done",
};

// Small colour-coded pill naming a task's status (in progress / blocked / on
// hold / open / done) so it reads at a glance in item lists. Renders nothing for
// items without a known task status (e.g. notes). Colours live in index.css
// (.badge-status-*).
export function TaskStatusBadge({ status }: { status: string | undefined }) {
  const { t } = useTranslation();
  if (!isTaskStatus(status)) return null;
  return <span className={STATUS_CLASS[status]}>{t(STATUS_KEY[status])}</span>;
}
