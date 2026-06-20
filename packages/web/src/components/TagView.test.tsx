import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import { TagView } from "./TagView";
import { ItemType } from "../types";

const mockGetItemsForTag = vi.fn();
const mockGetCollapsed = vi.fn();
const mockArchive = vi.fn();
const mockCreateDivider = vi.fn();
const mockTagItem = vi.fn();
const mockOpenItem = vi.fn();
const mockRemoveUnsorted = vi.fn();
const mockLoadTags = vi.fn();
const mockHideCompletedGet = vi.fn();
const mockHideCompletedSave = vi.fn();

vi.mock("../api", () => ({
  tags: {
    getItemsForTag: (...args: unknown[]) => mockGetItemsForTag(...args),
    tagItem: (...args: unknown[]) => mockTagItem(...args),
  },
  items: {
    archive: (...args: unknown[]) => mockArchive(...args),
    createDivider: (...args: unknown[]) => mockCreateDivider(...args),
    update: vi.fn().mockResolvedValue({}),
  },
  collapsedDividers: {
    get: (...args: unknown[]) => mockGetCollapsed(...args),
    save: vi.fn().mockResolvedValue(undefined),
  },
  hideCompleted: {
    get: (...args: unknown[]) => mockHideCompletedGet(...args),
    save: (...args: unknown[]) => mockHideCompletedSave(...args),
  },
  sortOrders: {
    get: vi.fn().mockResolvedValue([]),
    save: vi.fn().mockResolvedValue(undefined),
  },
  reportClientError: vi.fn(),
}));

vi.mock("../context/AppContext", () => ({
  useApp: () => ({
    openItem: mockOpenItem,
    removeUnsorted: mockRemoveUnsorted,
    loadTags: mockLoadTags,
    state: { refreshKey: 0, unsortedItems: [] },
  }),
}));

const tag = {
  id: "t1",
  user_id: "u1",
  name: "recipes",
  tag_source: "manual" as const,
  color: null,
  created_at: "",
  updated_at: "",
};

function makeItem(id: string, title: string, type = ItemType.Untyped) {
  return {
    id,
    user_id: "u1",
    title,
    item_type: type,
    status: "Active",
    created_at: "",
    updated_at: "",
  };
}

function makeTask(id: string, title: string, status: string) {
  return { ...makeItem(id, title, ItemType.Task), type_data: { task_status: status } };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetCollapsed.mockResolvedValue([]);
  // Default behaviour of the toggle is ON (completed hidden).
  mockHideCompletedGet.mockResolvedValue(true);
  mockHideCompletedSave.mockResolvedValue(undefined);
});

describe("TagView", () => {
  test("renders tag name and item count", async () => {
    mockGetItemsForTag.mockResolvedValue([
      makeItem("1", "Pancakes"),
      makeItem("2", "Waffles"),
    ]);

    render(<TagView tag={tag} />);

    await waitFor(() =>
      expect(screen.getByText("2 items")).toBeInTheDocument(),
    );
    expect(screen.getByText("recipes")).toBeInTheDocument();
  });

  test("shows loading then items", async () => {
    mockGetItemsForTag.mockResolvedValue([makeItem("1", "Pancakes")]);

    render(<TagView tag={tag} />);

    expect(screen.getByText("Loading…")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText("Pancakes")).toBeInTheDocument(),
    );
  });

  test("shows empty state when no items", async () => {
    mockGetItemsForTag.mockResolvedValue([]);

    render(<TagView tag={tag} />);

    await waitFor(() =>
      expect(screen.getByText("No items with this tag")).toBeInTheDocument(),
    );
  });

  test("clicking item opens it", async () => {
    mockGetItemsForTag.mockResolvedValue([makeItem("i1", "Click me")]);

    render(<TagView tag={tag} />);

    await waitFor(() =>
      expect(screen.getByText("Click me")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText("Click me"));

    expect(mockOpenItem).toHaveBeenCalledWith("i1");
  });

  test("dividers do not count toward item count", async () => {
    mockGetItemsForTag.mockResolvedValue([
      makeItem("1", "Item", ItemType.Untyped),
      makeItem("2", "Section", ItemType.Divider),
    ]);

    render(<TagView tag={tag} />);

    await waitFor(() =>
      expect(screen.getByText("1 items")).toBeInTheDocument(),
    );
  });

  test("archiving an item refreshes tag counts", async () => {
    mockGetItemsForTag.mockResolvedValue([makeItem("i1", "Trash me")]);
    mockArchive.mockResolvedValue({});

    render(<TagView tag={tag} />);

    await waitFor(() =>
      expect(screen.getByText("Trash me")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTitle("Move to trash"));

    await waitFor(() => expect(mockArchive).toHaveBeenCalledWith("i1"));
    await waitFor(() => expect(mockLoadTags).toHaveBeenCalled());
  });

  test("fetches items with limit 500", async () => {
    mockGetItemsForTag.mockResolvedValue([]);

    render(<TagView tag={tag} />);

    await waitFor(() =>
      expect(mockGetItemsForTag).toHaveBeenCalledWith("t1", 500),
    );
  });

  describe("hide completed", () => {
    test("hides completed tasks by default (toggle ON)", async () => {
      mockGetItemsForTag.mockResolvedValue([
        makeTask("a", "Active task", "Open"),
        makeTask("b", "Finished task", "Done"),
      ]);

      render(<TagView tag={tag} />);

      await waitFor(() =>
        expect(screen.getByText("Active task")).toBeInTheDocument(),
      );
      expect(screen.queryByText("Finished task")).not.toBeInTheDocument();
    });

    test("toggling the filter off reveals completed tasks again (reversible)", async () => {
      mockGetItemsForTag.mockResolvedValue([
        makeTask("a", "Active task", "Open"),
        makeTask("b", "Finished task", "Done"),
      ]);

      render(<TagView tag={tag} />);

      await waitFor(() =>
        expect(screen.getByText("Active task")).toBeInTheDocument(),
      );
      expect(screen.queryByText("Finished task")).not.toBeInTheDocument();

      fireEvent.click(screen.getByTitle("Hide done"));

      await waitFor(() =>
        expect(screen.getByText("Finished task")).toBeInTheDocument(),
      );
      // The non-completed item is still there — nothing was mutated.
      expect(screen.getByText("Active task")).toBeInTheDocument();
    });

    test("persists the toggle per tag when changed", async () => {
      mockGetItemsForTag.mockResolvedValue([makeTask("a", "Active task", "Open")]);

      render(<TagView tag={tag} />);

      await waitFor(() =>
        expect(screen.getByText("Active task")).toBeInTheDocument(),
      );
      fireEvent.click(screen.getByTitle("Hide done"));

      await waitFor(() =>
        expect(mockHideCompletedSave).toHaveBeenCalledWith("t1", false),
      );
    });

    test("respects a stored OFF preference on load", async () => {
      mockHideCompletedGet.mockResolvedValue(false);
      mockGetItemsForTag.mockResolvedValue([
        makeTask("b", "Finished task", "Done"),
      ]);

      render(<TagView tag={tag} />);

      await waitFor(() =>
        expect(screen.getByText("Finished task")).toBeInTheDocument(),
      );
    });

    test("a task with a garbage status is treated as not-completed and stays visible", async () => {
      mockGetItemsForTag.mockResolvedValue([
        { ...makeItem("g", "Garbage task", ItemType.Task), type_data: "broken" },
      ]);

      render(<TagView tag={tag} />);

      // Default toggle is ON; a malformed item must never be hidden or crash.
      await waitFor(() =>
        expect(screen.getByText("Garbage task")).toBeInTheDocument(),
      );
    });
  });
});
