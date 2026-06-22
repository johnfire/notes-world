import { ItemType, TaskStatus } from "@notes-world/shared";
import type { Item } from "@notes-world/shared";
import { colors } from "../theme";

// Task status → colour/label, shared by the item card, the task-board lanes, and
// anywhere a task's status is shown — so a status reads the same everywhere and
// the maps live in one place. Labels mirror the web Kanban (PascalCase enum →
// spaced label).
export const STATUS_COLORS: Record<string, string> = {
  [TaskStatus.Open]: colors.statusOpen,
  [TaskStatus.InProgress]: colors.statusInProgress,
  [TaskStatus.OnHold]: colors.statusOnHold,
  [TaskStatus.Blocked]: colors.statusBlocked,
  [TaskStatus.Done]: colors.statusDone,
};

export const STATUS_LABELS: Record<string, string> = {
  [TaskStatus.Open]: "Open",
  [TaskStatus.InProgress]: "In Progress",
  [TaskStatus.OnHold]: "On Hold",
  [TaskStatus.Blocked]: "Blocked",
  [TaskStatus.Done]: "Done",
};

// A task with a missing or unrecognised status reads as Open, matching the
// item-detail editor's default. Non-task items return null (no status bar).
export function taskStatusOf(item: Item): TaskStatus | null {
  if (item.item_type !== ItemType.Task) return null;
  const s = (item.type_data as { task_status?: string } | null)?.task_status;
  return (Object.values(TaskStatus) as string[]).includes(s ?? "")
    ? (s as TaskStatus)
    : TaskStatus.Open;
}
