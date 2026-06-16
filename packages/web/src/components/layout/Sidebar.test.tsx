import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import { Sidebar } from "./Sidebar";

const mockDeleteTag = vi.fn();
const mockLoadTags = vi.fn();
const mockRefresh = vi.fn();
const mockRemoveUnsorted = vi.fn();
const mockOnTagSelect = vi.fn();
const mockOnTrashSelect = vi.fn();

const tags = [
  {
    id: "t1",
    user_id: "u1",
    name: "work",
    color: null,
    count: 3,
    created_at: "",
    updated_at: "",
  },
  {
    id: "t2",
    user_id: "u1",
    name: "home",
    color: null,
    count: 1,
    created_at: "",
    updated_at: "",
  },
];

vi.mock("../../api", () => ({
  tags: {
    delete: (...args: unknown[]) => mockDeleteTag(...args),
    create: vi.fn(),
    rename: vi.fn(),
    setColor: vi.fn(),
    tagItem: vi.fn(),
    untagItem: vi.fn(),
  },
  sortOrders: {
    get: vi.fn().mockResolvedValue([]),
    save: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("../../context/AppContext", () => ({
  useApp: () => ({
    state: { tags },
    refresh: mockRefresh,
    loadTags: mockLoadTags,
    removeUnsorted: mockRemoveUnsorted,
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockDeleteTag.mockResolvedValue(undefined);
  vi.spyOn(window, "confirm").mockReturnValue(true);
});

function renderSidebar(selectedTagId: string | null = null) {
  return render(
    <Sidebar
      onTagSelect={mockOnTagSelect}
      selectedTagId={selectedTagId}
      onTrashSelect={mockOnTrashSelect}
      showTrash={false}
    />,
  );
}

describe("Sidebar tag deletion", () => {
  test("delete button removes the tag and refreshes the list", async () => {
    renderSidebar();

    await waitFor(() => expect(screen.getByText("work")).toBeInTheDocument());
    fireEvent.click(screen.getAllByTitle("Delete tag")[0]);

    // Both confirms return true → delete the tag and its notes.
    await waitFor(() =>
      expect(mockDeleteTag).toHaveBeenCalledWith("t1", true),
    );
    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() => expect(mockLoadTags).toHaveBeenCalled());
    expect(mockOnTagSelect).not.toHaveBeenCalled();
  });

  test("declining the second prompt deletes the tag only", async () => {
    vi.spyOn(window, "confirm")
      .mockReturnValueOnce(true) // confirm deletion
      .mockReturnValueOnce(false); // keep the notes
    renderSidebar();

    await waitFor(() => expect(screen.getByText("work")).toBeInTheDocument());
    fireEvent.click(screen.getAllByTitle("Delete tag")[0]);

    await waitFor(() =>
      expect(mockDeleteTag).toHaveBeenCalledWith("t1", false),
    );
  });

  test("deleting the selected tag switches back to all items", async () => {
    renderSidebar("t1");

    await waitFor(() => expect(screen.getByText("work")).toBeInTheDocument());
    fireEvent.click(screen.getAllByTitle("Delete tag")[0]);

    await waitFor(() =>
      expect(mockDeleteTag).toHaveBeenCalledWith("t1", true),
    );
    await waitFor(() => expect(mockOnTagSelect).toHaveBeenCalledWith(null));
  });

  test("does nothing when confirm is cancelled", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    renderSidebar();

    await waitFor(() => expect(screen.getByText("work")).toBeInTheDocument());
    fireEvent.click(screen.getAllByTitle("Delete tag")[0]);

    expect(mockDeleteTag).not.toHaveBeenCalled();
  });
});
