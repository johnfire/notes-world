import { describe, test, expect } from "vitest";
import {
  computeDepths,
  parentsWithChildren,
  hiddenByCollapse,
  type HierItem,
} from "./hierarchy";

const item = (id: string, parent_id: string | null = null): HierItem => ({
  id,
  parent_id,
});

describe("computeDepths", () => {
  test("top-level items are depth 0", () => {
    const d = computeDepths([item("a"), item("b")]);
    expect(d.get("a")).toBe(0);
    expect(d.get("b")).toBe(0);
  });

  test("nested items increase in depth", () => {
    // a > b > c
    const d = computeDepths([item("a"), item("b", "a"), item("c", "b")]);
    expect([d.get("a"), d.get("b"), d.get("c")]).toEqual([0, 1, 2]);
  });

  test("an item whose parent isn't present floats to depth 0", () => {
    const d = computeDepths([item("orphan", "missing")]);
    expect(d.get("orphan")).toBe(0);
  });
});

describe("parentsWithChildren", () => {
  test("only items that actually have children are included", () => {
    const p = parentsWithChildren([item("a"), item("b", "a"), item("c")]);
    expect(p.has("a")).toBe(true);
    expect(p.has("b")).toBe(false);
    expect(p.has("c")).toBe(false);
  });
});

describe("hiddenByCollapse", () => {
  test("descendants of a collapsed item are hidden", () => {
    // a > b > c ; collapse a
    const items = [item("a"), item("b", "a"), item("c", "b")];
    const hidden = hiddenByCollapse(items, new Set(["a"]));
    expect(hidden.has("b")).toBe(true);
    expect(hidden.has("c")).toBe(true); // deep descendant too
    expect(hidden.has("a")).toBe(false); // the collapsed item itself stays
  });

  test("nothing hidden when nothing is collapsed", () => {
    const items = [item("a"), item("b", "a")];
    expect(hiddenByCollapse(items, new Set()).size).toBe(0);
  });
});
