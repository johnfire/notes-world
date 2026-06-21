import { describe, test, expect } from "vitest";
import { subtreeIds, treeDropOrder, type HierItem } from "./hierarchy";

const item = (id: string, parent_id: string | null = null): HierItem => ({
  id,
  parent_id,
});

describe("subtreeIds", () => {
  test("a leaf is just itself", () => {
    expect(subtreeIds([item("a"), item("b")], ["a", "b"], "a")).toEqual(["a"]);
  });

  test("includes descendants depth-first", () => {
    // a > (b, c); b > d
    const items = [item("a"), item("b", "a"), item("c", "a"), item("d", "b")];
    expect(subtreeIds(items, ["a", "b", "d", "c"], "a")).toEqual([
      "a", "b", "d", "c",
    ]);
  });

  test("orders siblings by the given flat order", () => {
    const items = [item("a"), item("x", "a"), item("y", "a")];
    expect(subtreeIds(items, ["a", "y", "x"], "a")).toEqual(["a", "y", "x"]);
  });
});

describe("treeDropOrder", () => {
  test("drop INTO makes the item the target's last child", () => {
    expect(treeDropOrder([item("a"), item("b")], ["a", "b"], "b", "a", "into"))
      .toEqual(["a", "b"]);
    // a, c(child of a), b → drop b into a lands after c
    const items = [item("a"), item("c", "a"), item("b")];
    expect(treeDropOrder(items, ["a", "c", "b"], "b", "a", "into"))
      .toEqual(["a", "c", "b"]);
  });

  test("drop BEFORE places the item just above the target", () => {
    const items = [item("a"), item("b"), item("c")];
    expect(treeDropOrder(items, ["a", "b", "c"], "c", "b", "before"))
      .toEqual(["a", "c", "b"]);
  });

  test("moves the whole subtree together", () => {
    // a, b, b1(child of b), c → move b into c carries b1 along
    const items = [item("a"), item("b"), item("b1", "b"), item("c")];
    expect(treeDropOrder(items, ["a", "b", "b1", "c"], "b", "c", "into"))
      .toEqual(["a", "c", "b", "b1"]);
  });

  test("un-nest: drop a child before a top-level item", () => {
    const items = [item("a"), item("a1", "a"), item("b")];
    expect(treeDropOrder(items, ["a", "a1", "b"], "a1", "b", "before"))
      .toEqual(["a", "a1", "b"]);
  });

  test("refuses to drop an item into its own subtree (no-op)", () => {
    const items = [item("a"), item("a1", "a")];
    expect(treeDropOrder(items, ["a", "a1"], "a", "a1", "into"))
      .toEqual(["a", "a1"]);
  });

  test("no-op when dropping onto itself", () => {
    expect(treeDropOrder([item("a"), item("b")], ["a", "b"], "a", "a", "into"))
      .toEqual(["a", "b"]);
  });
});
