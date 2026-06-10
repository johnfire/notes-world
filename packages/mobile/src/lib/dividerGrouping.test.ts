import { describe, it, expect } from "vitest";
import { ItemType, ItemStatus } from "@notes-world/shared";
import type { Item } from "@notes-world/shared";
import { getParentDividerMap, getHiddenCounts } from "./dividerGrouping";

function item(id: string, item_type: ItemType): Item {
  return {
    id,
    user_id: "u1",
    title: id,
    item_type,
    status: ItemStatus.Active,
    created_at: "2026-06-10T00:00:00Z",
    updated_at: "2026-06-10T00:00:00Z",
  };
}

// items: a (note), D1 (divider), b (note), c (task), D2 (divider), d (note)
const items: Item[] = [
  item("a", ItemType.Note),
  item("D1", ItemType.Divider),
  item("b", ItemType.Note),
  item("c", ItemType.Task),
  item("D2", ItemType.Divider),
  item("d", ItemType.Note),
];

describe("getParentDividerMap", () => {
  it("maps items before the first divider to null", () => {
    expect(getParentDividerMap(items).get("a")).toBeNull();
  });

  it("maps items to the divider that precedes them", () => {
    const map = getParentDividerMap(items);
    expect(map.get("b")).toBe("D1");
    expect(map.get("c")).toBe("D1");
    expect(map.get("d")).toBe("D2");
  });

  it("does not assign a parent to divider rows themselves", () => {
    const map = getParentDividerMap(items);
    expect(map.has("D1")).toBe(false);
    expect(map.has("D2")).toBe(false);
  });
});

describe("getHiddenCounts", () => {
  it("counts only non-divider items under each divider", () => {
    const counts = getHiddenCounts(items);
    expect(counts.get("D1")).toBe(2);
    expect(counts.get("D2")).toBe(1);
  });

  it("returns no count for a divider with no following items", () => {
    const trailing = [item("D3", ItemType.Divider)];
    expect(getHiddenCounts(trailing).get("D3")).toBeUndefined();
  });
});
