import { describe, it, expect } from "vitest";
import { applySavedOrder, moveItem } from "./sortItems";

const items = [{ id: "a" }, { id: "b" }, { id: "c" }];

describe("applySavedOrder", () => {
  it("orders items by their saved position", () => {
    const rows = [
      { item_id: "c", sort_order: 0 },
      { item_id: "a", sort_order: 1 },
      { item_id: "b", sort_order: 2 },
    ];
    expect(applySavedOrder(items, rows).map((i) => i.id)).toEqual([
      "c",
      "a",
      "b",
    ]);
  });

  it("puts items without a saved position at the end, keeping fetch order", () => {
    const rows = [{ item_id: "b", sort_order: 0 }];
    expect(applySavedOrder(items, rows).map((i) => i.id)).toEqual([
      "b",
      "a",
      "c",
    ]);
  });

  it("returns items unchanged when there is no saved order", () => {
    expect(applySavedOrder(items, []).map((i) => i.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });
});

describe("moveItem", () => {
  it("moves an item up", () => {
    expect(moveItem(["a", "b", "c"], 1, -1)).toEqual(["b", "a", "c"]);
  });

  it("moves an item down", () => {
    expect(moveItem(["a", "b", "c"], 1, 1)).toEqual(["a", "c", "b"]);
  });

  it("does nothing at the edges", () => {
    expect(moveItem(["a", "b"], 0, -1)).toEqual(["a", "b"]);
    expect(moveItem(["a", "b"], 1, 1)).toEqual(["a", "b"]);
  });
});
