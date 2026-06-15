import { describe, it, expect } from "vitest";
import { ItemType, ItemStatus } from "@notes-world/shared";
import type { Item } from "@notes-world/shared";
import {
  formatDueShort,
  sortItemsByDate,
  dateOf,
  mergeTypeData,
} from "./dueDate";

function task(
  id: string,
  title: string,
  dates?: { due_date?: string; start_date?: string },
): Item {
  return {
    id,
    user_id: "u1",
    title,
    item_type: ItemType.Task,
    status: ItemStatus.Active,
    type_data: dates ? { ...dates } : undefined,
    created_at: "",
    updated_at: "",
  } as Item;
}

describe("formatDueShort", () => {
  it("shows month and day for the current year", () => {
    const now = new Date();
    const d = new Date(now.getFullYear(), 5, 18); // Jun 18
    expect(formatDueShort(d.toISOString())).toBe("Jun 18");
  });

  it("appends a 2-digit year when the year differs from now", () => {
    const otherYear = new Date().getFullYear() + 1;
    const d = new Date(otherYear, 5, 18);
    expect(formatDueShort(d.toISOString())).toBe(
      `Jun 18 '${String(otherYear).slice(-2)}`,
    );
  });

  it("returns empty string for an invalid date", () => {
    expect(formatDueShort("not-a-date")).toBe("");
  });

  it("parses a date-only string in local time (no UTC off-by-one)", () => {
    // In a negative-UTC zone, new Date('2026-06-18') is the 17th locally.
    // The helper must still render the calendar day the user picked.
    const orig = process.env.TZ;
    process.env.TZ = "America/New_York";
    try {
      expect(formatDueShort("2026-06-18")).toBe("Jun 18");
    } finally {
      process.env.TZ = orig;
    }
  });
});

describe("mergeTypeData", () => {
  it("preserves sibling keys (task_status, priority) when setting a date", () => {
    const existing = { task_status: "Open", priority: "High" };
    expect(mergeTypeData(existing, "due_date", "2026-06-18")).toEqual({
      task_status: "Open",
      priority: "High",
      due_date: "2026-06-18",
    });
  });

  it("clears the field on a null value, keeping the rest", () => {
    const existing = {
      task_status: "Open",
      priority: "High",
      due_date: "2026-06-18",
    };
    expect(mergeTypeData(existing, "due_date", null)).toEqual({
      task_status: "Open",
      priority: "High",
    });
  });

  it("tolerates null/undefined existing type_data", () => {
    expect(mergeTypeData(null, "start_date", "2026-01-01")).toEqual({
      start_date: "2026-01-01",
    });
  });

  it("does not mutate the input object", () => {
    const existing = { task_status: "Open", due_date: "2026-01-01" };
    mergeTypeData(existing, "due_date", null);
    expect(existing).toEqual({ task_status: "Open", due_date: "2026-01-01" });
  });
});

describe("dateOf", () => {
  it("reads the requested field, treating empty as absent", () => {
    const item = task("a", "A", { due_date: "2026-01-01", start_date: "" });
    expect(dateOf(item, "due_date")).toBe("2026-01-01");
    expect(dateOf(item, "start_date")).toBeUndefined();
  });
});

describe("sortItemsByDate", () => {
  it("orders dated tasks ascending, undated last (due_date)", () => {
    const items = [
      task("a", "Alpha"), // undated
      task("c", "Charlie", { due_date: "2026-03-01T00:00:00Z" }),
      task("b", "Bravo", { due_date: "2026-01-01T00:00:00Z" }),
    ];
    expect(sortItemsByDate(items, "due_date").map((i) => i.id)).toEqual([
      "b",
      "c",
      "a",
    ]);
  });

  it("sorts by start_date independently of due_date", () => {
    const items = [
      task("late", "Late", { start_date: "2026-05-01T00:00:00Z" }),
      task("early", "Early", { start_date: "2026-02-01T00:00:00Z" }),
      task("nostart", "NoStart", { due_date: "2026-01-01T00:00:00Z" }),
    ];
    expect(sortItemsByDate(items, "start_date").map((i) => i.id)).toEqual([
      "early",
      "late",
      "nostart",
    ]);
  });

  it("tie-breaks equal dates by title", () => {
    const items = [
      task("z", "Zebra", { due_date: "2026-01-01T00:00:00Z" }),
      task("m", "Mango", { due_date: "2026-01-01T00:00:00Z" }),
    ];
    expect(sortItemsByDate(items, "due_date").map((i) => i.id)).toEqual([
      "m",
      "z",
    ]);
  });

  it("treats an invalid date as undated", () => {
    const items = [
      task("bad", "Bad", { due_date: "not-a-date" }),
      task("good", "Good", { due_date: "2026-01-01T00:00:00Z" }),
    ];
    expect(sortItemsByDate(items, "due_date").map((i) => i.id)).toEqual([
      "good",
      "bad",
    ]);
  });

  it("does not mutate the input array", () => {
    const items = [
      task("a", "A", { due_date: "2026-02-01T00:00:00Z" }),
      task("b", "B", { due_date: "2026-01-01T00:00:00Z" }),
    ];
    const before = items.map((i) => i.id);
    sortItemsByDate(items, "due_date");
    expect(items.map((i) => i.id)).toEqual(before);
  });
});
