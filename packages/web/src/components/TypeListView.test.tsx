import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import { TypeListView } from "./TypeListView";
import { ItemType } from "../types";

const mockByType = vi.fn();
const mockArchive = vi.fn();
const mockOpenItem = vi.fn();
const mockLoadTags = vi.fn();

vi.mock("../api", () => ({
  items: {
    byType: (...args: unknown[]) => mockByType(...args),
    archive: (...args: unknown[]) => mockArchive(...args),
  },
}));

vi.mock("../context/AppContext", () => ({
  useApp: () => ({
    openItem: mockOpenItem,
    loadTags: mockLoadTags,
    state: { refreshKey: 0 },
  }),
}));

function makeItem(id: string, title: string, type = ItemType.Note) {
  return {
    id, user_id: "u1", title, item_type: type,
    status: "Active", type_data: null,
    created_at: "", updated_at: new Date().toISOString(),
  };
}

beforeEach(() => vi.clearAllMocks());

describe("TypeListView", () => {
  test("loads items of the given type", async () => {
    mockByType.mockResolvedValue([]);
    render(<TypeListView type={ItemType.Note} />);
    await waitFor(() =>
      expect(mockByType).toHaveBeenCalledWith(ItemType.Note, 500),
    );
  });

  test("renders the loaded items", async () => {
    mockByType.mockResolvedValue([
      makeItem("1", "First note"),
      makeItem("2", "Second note"),
    ]);
    render(<TypeListView type={ItemType.Note} />);
    await waitFor(() =>
      expect(screen.getByText("First note")).toBeInTheDocument(),
    );
    expect(screen.getByText("Second note")).toBeInTheDocument();
  });

  test("clicking an item opens it", async () => {
    mockByType.mockResolvedValue([makeItem("i1", "Open me")]);
    render(<TypeListView type={ItemType.Untyped} />);
    await waitFor(() => expect(screen.getByText("Open me")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Open me"));
    expect(mockOpenItem).toHaveBeenCalledWith("i1");
  });

  test("shows the empty state when there are none", async () => {
    mockByType.mockResolvedValue([]);
    render(<TypeListView type={ItemType.Untyped} />);
    await waitFor(() =>
      expect(screen.getByText("Nothing here yet")).toBeInTheDocument(),
    );
  });

  test("archiving removes the item from the list", async () => {
    mockByType.mockResolvedValue([makeItem("a", "Trash me")]);
    mockArchive.mockResolvedValue({});
    render(<TypeListView type={ItemType.Note} />);
    await waitFor(() => expect(screen.getByText("Trash me")).toBeInTheDocument());
    fireEvent.click(screen.getByTitle("Archive"));
    await waitFor(() => expect(mockArchive).toHaveBeenCalledWith("a"));
    await waitFor(() =>
      expect(screen.queryByText("Trash me")).not.toBeInTheDocument(),
    );
  });
});
