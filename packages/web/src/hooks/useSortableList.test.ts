import { renderHook, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { useSortableList } from "./useSortableList";

const mockGet = vi.fn();
const mockSave = vi.fn();

vi.mock("../api", () => ({
  sortOrders: {
    get: (...args: unknown[]) => mockGet(...args),
    save: (...args: unknown[]) => mockSave(...args),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockSave.mockResolvedValue(undefined);
});

describe("useSortableList", () => {
  // Regression: items load async after mount (like TagView), so the saved
  // order must still be applied once they arrive.
  test("applies saved order when items arrive after mount", async () => {
    mockGet.mockResolvedValue([
      { item_id: "b", sort_order: 0 },
      { item_id: "a", sort_order: 1 },
    ]);

    const { result, rerender } = renderHook(
      ({ items }: { items: { id: string }[] }) =>
        useSortableList(items, "tag:t1"),
      { initialProps: { items: [] as { id: string }[] } },
    );

    rerender({ items: [{ id: "a" }, { id: "b" }] });

    await waitFor(() =>
      expect(result.current.orderedItems.map((i) => i.id)).toEqual(["b", "a"]),
    );
  });

  test("applies saved order of the new context after switching", async () => {
    mockGet.mockImplementation((key: string) =>
      Promise.resolve(
        key === "tag:t2"
          ? [
              { item_id: "y", sort_order: 0 },
              { item_id: "x", sort_order: 1 },
            ]
          : [],
      ),
    );

    const { result, rerender } = renderHook(
      ({ items, ctx }: { items: { id: string }[]; ctx: string }) =>
        useSortableList(items, ctx),
      { initialProps: { items: [{ id: "a" }, { id: "b" }], ctx: "tag:t1" } },
    );

    await waitFor(() =>
      expect(result.current.orderedItems.map((i) => i.id)).toEqual(["a", "b"]),
    );

    // Switch tag: contextKey changes first, items arrive afterwards.
    rerender({ items: [{ id: "a" }, { id: "b" }], ctx: "tag:t2" });
    rerender({ items: [{ id: "x" }, { id: "y" }], ctx: "tag:t2" });

    await waitFor(() =>
      expect(result.current.orderedItems.map((i) => i.id)).toEqual(["y", "x"]),
    );
  });

  test("items without a saved position go to the end", async () => {
    mockGet.mockResolvedValue([
      { item_id: "b", sort_order: 0 },
      { item_id: "a", sort_order: 1 },
    ]);

    const { result, rerender } = renderHook(
      ({ items }: { items: { id: string }[] }) =>
        useSortableList(items, "tag:t1"),
      { initialProps: { items: [] as { id: string }[] } },
    );

    rerender({ items: [{ id: "new" }, { id: "a" }, { id: "b" }] });

    await waitFor(() =>
      expect(result.current.orderedItems.map((i) => i.id)).toEqual([
        "b",
        "a",
        "new",
      ]),
    );
  });
});
