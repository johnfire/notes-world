import { describe, it, expect } from "vitest";
import {
  isCompleted,
  omitCompleted,
  selectCompletedItems,
  decodeHideCompleted,
  encodeHideCompleted,
  HIDE_COMPLETED_SHOWN,
  HIDE_COMPLETED_HIDDEN,
} from "./completion";
import { Item, ItemType, TaskStatus } from "../types";

// Minimal item factory — only the fields the completion helpers read.
function item(over: Partial<Item> & { type_data?: unknown } = {}): Item {
  return {
    id: over.id ?? "i1",
    user_id: "u1",
    title: over.title ?? "Task",
    item_type: over.item_type ?? ItemType.Task,
    status: "Active",
    created_at: "",
    updated_at: "",
    ...over,
  } as Item;
}

const done = (over: Partial<Item> = {}) =>
  item({ type_data: { task_status: TaskStatus.Done }, ...over });
const open = (over: Partial<Item> = {}) =>
  item({ type_data: { task_status: TaskStatus.Open }, ...over });

describe("isCompleted", () => {
  it("is true only for a Done task", () => {
    expect(isCompleted(done())).toBe(true);
  });

  it("is false for non-Done statuses", () => {
    expect(isCompleted(open())).toBe(false);
    expect(isCompleted(item({ type_data: { task_status: TaskStatus.Blocked } }))).toBe(
      false,
    );
  });

  it("is false for items with no completion field, and never throws on garbage", () => {
    // Each of these is a malformed/edge-case item: worst case it reads as
    // not-completed (so it stays visible) rather than crashing.
    expect(isCompleted(item({ type_data: undefined }))).toBe(false);
    expect(isCompleted(item({ type_data: null }))).toBe(false);
    expect(isCompleted(item({ type_data: "not-an-object" as unknown }))).toBe(false);
    expect(isCompleted(item({ type_data: { task_status: 42 as unknown } }))).toBe(false);
    expect(isCompleted(item({ type_data: { task_status: "done" } }))).toBe(false); // wrong case
    expect(isCompleted(null)).toBe(false);
    expect(isCompleted(undefined)).toBe(false);
    expect(isCompleted({} as Item)).toBe(false);
  });

  it("is false for non-task items", () => {
    expect(isCompleted(item({ item_type: ItemType.Note, type_data: undefined }))).toBe(
      false,
    );
  });
});

describe("omitCompleted (the hide-completed view filter)", () => {
  it("removes completed items and keeps the rest", () => {
    const items = [open({ id: "a" }), done({ id: "b" }), open({ id: "c" })];
    expect(omitCompleted(items).map((i) => i.id)).toEqual(["a", "c"]);
  });

  it("keeps a garbage item rather than dropping or crashing", () => {
    const garbage = item({ id: "g", type_data: { task_status: null as unknown } });
    expect(omitCompleted([garbage]).map((i) => i.id)).toEqual(["g"]);
  });

  it("is non-mutating and reversible: input is untouched and omitted ∪ kept = all", () => {
    const items = [open({ id: "a" }), done({ id: "b" }), open({ id: "c" })];
    const snapshot = items.map((i) => i.id);
    const kept = omitCompleted(items);
    // Original array order/contents unchanged — toggling off restores everything.
    expect(items.map((i) => i.id)).toEqual(snapshot);
    const completed = items.filter(isCompleted);
    expect(new Set([...kept, ...completed].map((i) => i.id))).toEqual(
      new Set(snapshot),
    );
  });

  it("returns everything when nothing is completed", () => {
    const items = [open({ id: "a" }), open({ id: "b" })];
    expect(omitCompleted(items).map((i) => i.id)).toEqual(["a", "b"]);
  });
});

describe("selectCompletedItems (the Done view aggregation)", () => {
  it("keeps only completed items", () => {
    const items = [open({ id: "a" }), done({ id: "b" }), open({ id: "c" })];
    expect(selectCompletedItems(items).map((i) => i.id)).toEqual(["b"]);
  });

  it("sorts most-recently-completed first", () => {
    const older = done({
      id: "older",
      type_data: { task_status: TaskStatus.Done, completed_at: "2026-01-01T00:00:00Z" },
    });
    const newer = done({
      id: "newer",
      type_data: { task_status: TaskStatus.Done, completed_at: "2026-06-01T00:00:00Z" },
    });
    expect(selectCompletedItems([older, newer]).map((i) => i.id)).toEqual([
      "newer",
      "older",
    ]);
  });

  it("sorts a missing/garbage completed_at last and never throws", () => {
    const dated = done({
      id: "dated",
      type_data: { task_status: TaskStatus.Done, completed_at: "2026-06-01T00:00:00Z" },
    });
    const noDate = done({ id: "noDate" }); // Done but no completed_at
    const badDate = done({
      id: "badDate",
      type_data: { task_status: TaskStatus.Done, completed_at: "not-a-date" },
    });
    const result = selectCompletedItems([noDate, dated, badDate]).map((i) => i.id);
    expect(result[0]).toBe("dated");
    expect(result.slice(1).sort()).toEqual(["badDate", "noDate"]);
  });

  it("does not crash on a mixed bag of malformed items", () => {
    const items = [
      done({ id: "good" }),
      item({ id: "g1", type_data: null }),
      item({ id: "g2", type_data: "x" as unknown }),
      open({ id: "o" }),
    ];
    expect(selectCompletedItems(items).map((i) => i.id)).toEqual(["good"]);
  });
});

describe("hide-completed persistence (default ON)", () => {
  it("defaults to ON when nothing is stored", () => {
    expect(decodeHideCompleted([])).toBe(true);
    expect(decodeHideCompleted(null)).toBe(true);
    expect(decodeHideCompleted(undefined)).toBe(true);
  });

  it("reads the explicit shown sentinel as OFF", () => {
    expect(decodeHideCompleted([{ item_id: HIDE_COMPLETED_SHOWN }])).toBe(false);
  });

  it("reads the hidden sentinel as ON", () => {
    expect(decodeHideCompleted([{ item_id: HIDE_COMPLETED_HIDDEN }])).toBe(true);
  });

  it("encodes a single non-empty sentinel row in both directions", () => {
    // Must be non-empty: the sort-orders upsert ignores an empty array.
    expect(encodeHideCompleted(true)).toEqual([HIDE_COMPLETED_HIDDEN]);
    expect(encodeHideCompleted(false)).toEqual([HIDE_COMPLETED_SHOWN]);
    expect(encodeHideCompleted(true).length).toBe(1);
    expect(encodeHideCompleted(false).length).toBe(1);
  });

  it("round-trips: encode then decode returns the original state", () => {
    for (const hidden of [true, false]) {
      const rows = encodeHideCompleted(hidden).map((item_id) => ({ item_id }));
      expect(decodeHideCompleted(rows)).toBe(hidden);
    }
  });
});
