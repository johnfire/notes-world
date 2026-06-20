import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import { DoneView } from "./DoneView";
import { ItemType } from "../types";

const mockByType = vi.fn();
const mockOpenItem = vi.fn();

vi.mock("../api", () => ({
  items: {
    byType: (...args: unknown[]) => mockByType(...args),
  },
}));

vi.mock("../context/AppContext", () => ({
  useApp: () => ({
    openItem: mockOpenItem,
    state: { refreshKey: 0 },
  }),
}));

function makeTask(
  id: string,
  title: string,
  status: string,
  completed_at?: string,
) {
  return {
    id,
    user_id: "u1",
    title,
    item_type: ItemType.Task,
    status: "Active",
    type_data: { task_status: status, ...(completed_at ? { completed_at } : {}) },
    created_at: "",
    updated_at: "",
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("DoneView", () => {
  test("lists only completed tasks, newest completion first", async () => {
    mockByType.mockResolvedValue([
      makeTask("a", "Still open", "Open"),
      makeTask("b", "Done in Jan", "Done", "2026-01-01T00:00:00Z"),
      makeTask("c", "Done in Jun", "Done", "2026-06-01T00:00:00Z"),
    ]);

    render(<DoneView />);

    await waitFor(() =>
      expect(screen.getByText("Done in Jun")).toBeInTheDocument(),
    );
    expect(screen.getByText("Done in Jan")).toBeInTheDocument();
    expect(screen.queryByText("Still open")).not.toBeInTheDocument();

    // Newest-first ordering.
    const titles = screen
      .getAllByText(/^Done in/)
      .map((el) => el.textContent);
    expect(titles).toEqual(["Done in Jun", "Done in Jan"]);
  });

  test("fetches tasks across all tags (by type, not by tag)", async () => {
    mockByType.mockResolvedValue([]);

    render(<DoneView />);

    await waitFor(() =>
      expect(mockByType).toHaveBeenCalledWith(ItemType.Task, 200, 0),
    );
  });

  test("pages through every task so completed items are never missed", async () => {
    // A full page (200) then a short page → must request the second page, then stop.
    const fullPage = Array.from({ length: 200 }, (_, i) =>
      makeTask(`p1-${i}`, `Task ${i}`, "Open"),
    );
    mockByType
      .mockResolvedValueOnce(fullPage)
      .mockResolvedValueOnce([makeTask("done", "Last done", "Done")]);

    render(<DoneView />);

    await waitFor(() =>
      expect(screen.getByText("Last done")).toBeInTheDocument(),
    );
    expect(mockByType).toHaveBeenNthCalledWith(1, ItemType.Task, 200, 0);
    expect(mockByType).toHaveBeenNthCalledWith(2, ItemType.Task, 200, 200);
    expect(mockByType).toHaveBeenCalledTimes(2);
  });

  test("clicking a completed item opens it", async () => {
    mockByType.mockResolvedValue([makeTask("c", "Open me", "Done")]);

    render(<DoneView />);

    await waitFor(() => expect(screen.getByText("Open me")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Open me"));
    expect(mockOpenItem).toHaveBeenCalledWith("c");
  });

  test("shows an empty state when nothing is completed", async () => {
    mockByType.mockResolvedValue([makeTask("a", "Still open", "Open")]);

    render(<DoneView />);

    await waitFor(() =>
      expect(screen.getByText("No completed items yet")).toBeInTheDocument(),
    );
  });

  test("shows an error state when the fetch fails", async () => {
    mockByType.mockRejectedValue(new Error("boom"));

    render(<DoneView />);

    await waitFor(() =>
      expect(
        screen.getByText("Couldn't load completed items"),
      ).toBeInTheDocument(),
    );
  });

  test("does not crash on a malformed item — it is simply not listed", async () => {
    mockByType.mockResolvedValue([
      { id: "g", user_id: "u1", title: "Garbage", item_type: ItemType.Task, status: "Active", type_data: null, created_at: "", updated_at: "" },
      makeTask("c", "Real done", "Done"),
    ]);

    render(<DoneView />);

    await waitFor(() =>
      expect(screen.getByText("Real done")).toBeInTheDocument(),
    );
    expect(screen.queryByText("Garbage")).not.toBeInTheDocument();
  });
});
