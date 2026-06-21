// Changing an item's type resets its type_data to the new type's defaults — the
// server overwrites the whole JSON blob wholesale (see items.service.promoteItem
// + buildUpdate). This reports which type-specific fields currently hold
// meaningful, non-default data and would therefore be lost, so each surface can
// warn before a destructive conversion. An empty array means nothing is lost.
import { Item, ItemType, TaskStatus, Priority, IdeaMaturity } from "../types";

export type DroppedTypeField =
  | "status"
  | "priority"
  | "dueDate"
  | "startDate"
  | "maturity"
  | "remindAt";

export function droppedFieldsOnTypeChange(item: Item): DroppedTypeField[] {
  const td = (item.type_data ?? {}) as Record<string, unknown>;
  const dropped: DroppedTypeField[] = [];

  switch (item.item_type) {
    case ItemType.Task:
      // A fresh task (Open / Normal, no dates) carries nothing worth warning
      // about; only flag fields the user has actually set away from defaults.
      if (td.task_status && td.task_status !== TaskStatus.Open)
        dropped.push("status");
      if (td.priority && td.priority !== Priority.Normal)
        dropped.push("priority");
      if (td.due_date) dropped.push("dueDate");
      if (td.start_date) dropped.push("startDate");
      break;
    case ItemType.Idea:
      if (td.maturity && td.maturity !== IdeaMaturity.Seed)
        dropped.push("maturity");
      break;
    case ItemType.Reminder:
      if (td.remind_at) dropped.push("remindAt");
      break;
    // Note (only an optional free-text category) and Untyped hold nothing the
    // user edits through the apps, so converting away from them is lossless.
  }

  return dropped;
}
