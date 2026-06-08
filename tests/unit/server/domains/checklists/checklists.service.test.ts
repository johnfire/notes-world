import {
  Checklist,
  ChecklistItem,
} from "../../../../../packages/server/src/types";
import { TEST_USER_ID } from "../../../../helpers/itemFactory";

// Mock the repository before importing the service
jest.mock(
  "../../../../../packages/server/src/domains/checklists/checklists.repository",
);

import * as repo from "../../../../../packages/server/src/domains/checklists/checklists.repository";
import * as service from "../../../../../packages/server/src/domains/checklists/checklists.service";

const mockRepo = repo as jest.Mocked<typeof repo>;

beforeEach(() => jest.clearAllMocks());

function makeChecklist(overrides: Partial<Checklist> = {}): Checklist {
  return {
    id: "list-1",
    user_id: TEST_USER_ID,
    title: "Groceries",
    sort_order: 0,
    created_at: "2026-06-08T00:00:00Z",
    updated_at: "2026-06-08T00:00:00Z",
    ...overrides,
  };
}

function makeChecklistItem(
  overrides: Partial<ChecklistItem> = {},
): ChecklistItem {
  return {
    id: "item-1",
    checklist_id: "list-1",
    name: "Milk",
    checked: false,
    sort_order: 0,
    created_at: "2026-06-08T00:00:00Z",
    updated_at: "2026-06-08T00:00:00Z",
    ...overrides,
  };
}

describe("createChecklist", () => {
  test("creates a list with a trimmed title", async () => {
    const created = makeChecklist();
    mockRepo.insertChecklist.mockResolvedValue(created);

    const result = await service.createChecklist(TEST_USER_ID, "  Groceries  ");

    expect(mockRepo.insertChecklist).toHaveBeenCalledWith(
      TEST_USER_ID,
      "Groceries",
    );
    expect(result).toBe(created);
  });

  test("rejects an empty title", async () => {
    await expect(
      service.createChecklist(TEST_USER_ID, "   "),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(mockRepo.insertChecklist).not.toHaveBeenCalled();
  });

  test("rejects a title over 300 chars", async () => {
    await expect(
      service.createChecklist(TEST_USER_ID, "a".repeat(301)),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
});

describe("getChecklist", () => {
  test("returns the list with its items", async () => {
    const list = makeChecklist();
    const items = [makeChecklistItem()];
    mockRepo.findById.mockResolvedValue(list);
    mockRepo.findItems.mockResolvedValue(items);

    const result = await service.getChecklist(TEST_USER_ID, "list-1");

    expect(result).toEqual({ ...list, items });
  });

  test("throws NotFound when the list does not exist", async () => {
    mockRepo.findById.mockResolvedValue(null);
    await expect(
      service.getChecklist(TEST_USER_ID, "missing"),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("renameChecklist", () => {
  test("renames an existing list", async () => {
    const updated = makeChecklist({ title: "Renamed" });
    mockRepo.updateChecklist.mockResolvedValue(updated);

    const result = await service.renameChecklist(
      TEST_USER_ID,
      "list-1",
      "Renamed",
    );

    expect(mockRepo.updateChecklist).toHaveBeenCalledWith(
      "list-1",
      TEST_USER_ID,
      { title: "Renamed" },
    );
    expect(result).toBe(updated);
  });

  test("throws NotFound when missing", async () => {
    mockRepo.updateChecklist.mockResolvedValue(null);
    await expect(
      service.renameChecklist(TEST_USER_ID, "missing", "x"),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("deleteChecklist", () => {
  test("deletes an existing list", async () => {
    mockRepo.deleteChecklist.mockResolvedValue(true);
    await expect(
      service.deleteChecklist(TEST_USER_ID, "list-1"),
    ).resolves.toBeUndefined();
  });

  test("throws NotFound when missing", async () => {
    mockRepo.deleteChecklist.mockResolvedValue(false);
    await expect(
      service.deleteChecklist(TEST_USER_ID, "missing"),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("addItem", () => {
  test("adds an item to an existing list", async () => {
    const list = makeChecklist();
    const item = makeChecklistItem();
    mockRepo.findById.mockResolvedValue(list);
    mockRepo.insertItem.mockResolvedValue(item);

    const result = await service.addItem(TEST_USER_ID, "list-1", "  Milk  ");

    expect(mockRepo.insertItem).toHaveBeenCalledWith(
      "list-1",
      TEST_USER_ID,
      "Milk",
    );
    expect(result).toBe(item);
  });

  test("rejects an empty name", async () => {
    await expect(
      service.addItem(TEST_USER_ID, "list-1", "  "),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(mockRepo.insertItem).not.toHaveBeenCalled();
  });

  test("throws NotFound when the list does not belong to the user", async () => {
    mockRepo.findById.mockResolvedValue(null);
    await expect(
      service.addItem(TEST_USER_ID, "missing", "Milk"),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(mockRepo.insertItem).not.toHaveBeenCalled();
  });
});

describe("updateItem", () => {
  test("toggles checked", async () => {
    const item = makeChecklistItem({ checked: true });
    mockRepo.updateItem.mockResolvedValue(item);

    const result = await service.updateItem(TEST_USER_ID, "list-1", "item-1", {
      checked: true,
    });

    expect(mockRepo.updateItem).toHaveBeenCalledWith(
      "item-1",
      "list-1",
      TEST_USER_ID,
      { checked: true },
    );
    expect(result).toBe(item);
  });

  test("renames an item with a trimmed name", async () => {
    const item = makeChecklistItem({ name: "Oat milk" });
    mockRepo.updateItem.mockResolvedValue(item);

    await service.updateItem(TEST_USER_ID, "list-1", "item-1", {
      name: "  Oat milk  ",
    });

    expect(mockRepo.updateItem).toHaveBeenCalledWith(
      "item-1",
      "list-1",
      TEST_USER_ID,
      { name: "Oat milk" },
    );
  });

  test("rejects when no fields are provided", async () => {
    await expect(
      service.updateItem(TEST_USER_ID, "list-1", "item-1", {}),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(mockRepo.updateItem).not.toHaveBeenCalled();
  });

  test("throws NotFound when the item is missing", async () => {
    mockRepo.updateItem.mockResolvedValue(null);
    await expect(
      service.updateItem(TEST_USER_ID, "list-1", "missing", { checked: true }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("deleteItem", () => {
  test("deletes an existing item", async () => {
    mockRepo.deleteItem.mockResolvedValue(true);
    await expect(
      service.deleteItem(TEST_USER_ID, "list-1", "item-1"),
    ).resolves.toBeUndefined();
  });

  test("throws NotFound when missing", async () => {
    mockRepo.deleteItem.mockResolvedValue(false);
    await expect(
      service.deleteItem(TEST_USER_ID, "list-1", "missing"),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
