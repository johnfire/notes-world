import { describe, it, expect } from "vitest";
import { sortItemsByStatus } from "./dates";
import { Item, ItemType, TaskStatus } from "../types";

// Minimal task factory — only the fields the sorter reads.
function task(
  id: string,
  status: TaskStatus,
  dueDate?: string,
  title = id,
): Item {
  return {
    id,
    user_id: "u1",
    title,
    item_type: ItemType.Task,
    status: "Active",
    type_data: { task_status: status, ...(dueDate ? { due_date: dueDate } : {}) },
    created_at: "",
    updated_at: "",
  } as Item;
}

describe("sortItemsByStatus", () => {
  it("orders by status: InProgress → Blocked → OnHold → Open → Done", () => {
    const items = [
      task("done", TaskStatus.Done),
      task("open", TaskStatus.Open),
      task("onhold", TaskStatus.OnHold),
      task("blocked", TaskStatus.Blocked),
      task("inprogress", TaskStatus.InProgress),
    ];
    expect(sortItemsByStatus(items).map((i) => i.id)).toEqual([
      "inprogress",
      "blocked",
      "onhold",
      "open",
      "done",
    ]);
  });

  it("breaks ties within a status by soonest due date, undated last", () => {
    const items = [
      task("c", TaskStatus.Open),
      task("a", TaskStatus.Open, "2026-07-10"),
      task("b", TaskStatus.Open, "2026-07-01"),
    ];
    expect(sortItemsByStatus(items).map((i) => i.id)).toEqual(["b", "a", "c"]);
  });

  it("ranks non-task items (no status) after every known status", () => {
    const note = {
      id: "note",
      user_id: "u1",
      title: "a note",
      item_type: ItemType.Note,
      status: "Active",
      type_data: null,
      created_at: "",
      updated_at: "",
    } as Item;
    const items = [note, task("done", TaskStatus.Done)];
    expect(sortItemsByStatus(items).map((i) => i.id)).toEqual(["done", "note"]);
  });
});
