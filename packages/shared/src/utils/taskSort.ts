import { Priority, TaskStatus } from "../types";
import type { Item } from "../types";
import { dateOf } from "./dates";

// The Kanban lane order, shared by the web board columns and the mobile board so
// the two surfaces can never drift on either the lane order or the within-lane
// sort below.
export const TASK_BOARD_STATUSES: TaskStatus[] = [
  TaskStatus.Open,
  TaskStatus.OnHold,
  TaskStatus.InProgress,
  TaskStatus.Blocked,
  TaskStatus.Done,
];

// Lower rank sorts higher (closer to the top of a lane). A task with no priority
// set is treated as Normal, matching the editor's default.
const PRIORITY_RANK: Record<string, number> = {
  [Priority.Critical]: 0,
  [Priority.High]: 1,
  [Priority.Normal]: 2,
  [Priority.Low]: 3,
};

export function taskPriorityRank(item: Item): number {
  const p = (item.type_data as { priority?: string } | null)?.priority;
  return PRIORITY_RANK[p ?? Priority.Normal] ?? PRIORITY_RANK[Priority.Normal];
}

// Tiebreak within a priority: soonest due date first, undated tasks last.
function compareDue(a: Item, b: Item): number {
  const da = dateOf(a, "due_date");
  const db = dateOf(b, "due_date");
  if (da && db) return da < db ? -1 : da > db ? 1 : 0;
  if (da) return -1;
  if (db) return 1;
  return 0;
}

// Ordering within a single lane: priority first (Critical → Low), then soonest
// due date. Used by both the web Kanban columns and the mobile lanes.
export function compareTasksByPriorityThenDue(a: Item, b: Item): number {
  return taskPriorityRank(a) - taskPriorityRank(b) || compareDue(a, b);
}
