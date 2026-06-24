// Items domain service — business logic
// Full implementation in Phase 1.2
import {
  Item,
  ItemType,
  ItemStatus,
  TaskStatus,
  UserId,
  ItemId,
} from "../../types";
import { eventBus } from "../../events/eventBus";
import { LIMITS } from "../../constants";
import {
  ValidationError,
  NotFoundError,
  StateError,
  ConflictError,
  AuthorizationError,
} from "../../utils/errors";
import * as repo from "./items.repository";
import {
  CaptureItemInput,
  UpdateItemInput,
  PromoteItemInput,
} from "./items.types";

export async function listItems(
  userId: UserId,
  opts: { page: number; pageSize: number; status?: string; itemType?: string },
): Promise<{ items: Item[]; total: number; page: number; page_size: number }> {
  const result = await repo.findPaginated(userId, {
    page: opts.page,
    pageSize: opts.pageSize,
    status: opts.status as ItemStatus | undefined,
    itemType: opts.itemType as ItemType | undefined,
  });
  return { ...result, page: opts.page, page_size: opts.pageSize };
}

export async function captureItem(
  userId: UserId,
  input: CaptureItemInput,
): Promise<Item> {
  const title = input.title?.trim();
  if (!title) throw new ValidationError("Title is required");
  if (title.length > LIMITS.ITEM_TITLE_MAX) {
    throw new ValidationError("Title too long", {
      length: title.length,
      maximum: LIMITS.ITEM_TITLE_MAX,
    });
  }
  if (input.body && input.body.length > LIMITS.ITEM_BODY_MAX) {
    throw new ValidationError("Body too long", {
      length: input.body.length,
      maximum: LIMITS.ITEM_BODY_MAX,
    });
  }

  const item = await repo.insert(userId, title, input.body);
  eventBus.emit("ItemCaptured", { item, created_at: item.created_at });
  return item;
}

export async function getItemById(userId: UserId, id: ItemId): Promise<Item> {
  const item = await repo.findById(id, userId);
  if (!item) throw new NotFoundError("Item", id);
  return item;
}

export async function updateItem(
  userId: UserId,
  id: ItemId,
  input: UpdateItemInput,
): Promise<Item> {
  const item = await repo.findById(id, userId);
  if (!item) throw new NotFoundError("Item", id);
  if (item.user_id !== userId) throw new AuthorizationError("Not owner");
  if (item.status !== "Active")
    throw new StateError("Cannot update archived item");

  if (input.title !== undefined) {
    const title = input.title.trim();
    if (!title && item.item_type !== ItemType.Divider)
      throw new ValidationError("Title cannot be empty");
    if (title.length > LIMITS.ITEM_TITLE_MAX) {
      throw new ValidationError("Title too long", {
        length: title.length,
        maximum: LIMITS.ITEM_TITLE_MAX,
      });
    }
  }

  if (input.color !== undefined && input.color !== null) {
    if (!/^#[0-9a-fA-F]{3,8}$/.test(input.color)) {
      throw new ValidationError("color must be a hex color string");
    }
  }

  const updated = await repo.update(id, userId, input);
  if (!updated) throw new NotFoundError("Item", id);
  eventBus.emit("ItemUpdated", {
    item: updated,
    updated_at: updated.updated_at,
  });
  return updated;
}

export async function promoteItem(
  userId: UserId,
  id: ItemId,
  input: PromoteItemInput,
): Promise<Item> {
  const item = await repo.findById(id, userId);
  if (!item) throw new NotFoundError("Item", id);
  if (item.user_id !== userId) throw new AuthorizationError("Not owner");
  if (item.status !== "Active")
    throw new StateError("Cannot promote archived item");
  if (input.new_type === ItemType.Untyped)
    throw new ValidationError("Cannot promote to Untyped");

  const defaults = getTypeDefaults(input.new_type);
  const type_data = { ...defaults, ...(input.type_data ?? {}) };

  const updated = await repo.update(id, userId, {
    item_type: input.new_type,
    type_data,
  });
  if (!updated) throw new NotFoundError("Item", id);

  eventBus.emit("ItemPromoted", {
    item: updated,
    previous_type: item.item_type,
    new_type: input.new_type,
    promoted_at: updated.updated_at,
  });
  return updated;
}

// Give a freshly-tagged Untyped item the tag's prevailing type. Items captured
// inside a tag start Untyped; rather than make the user pick, we adopt whatever
// type is most common among the tag's other members (e.g. a new entry in a
// Task-heavy tag becomes a Task, with that type's default type_data).
//
// No-op unless the item is still Untyped — an explicit type is never overridden —
// and unless the tag actually has typed members to learn from. Returns the
// updated item when a type was inherited, otherwise the item unchanged.
export async function inheritTypeFromTag(
  userId: UserId,
  item: Item,
  tagId: string,
): Promise<Item> {
  if (item.item_type !== ItemType.Untyped) return item;
  if (item.status !== ItemStatus.Active) return item;

  const dominant = await repo.findDominantTypeForTag(userId, tagId, item.id);
  if (!dominant || dominant === ItemType.Untyped) return item;

  return promoteItem(userId, item.id, { new_type: dominant });
}

// Nest an item under another (or, with parentId null, move it back to the root).
// Type-agnostic — any item may parent any other — but guarded against cycles and
// against exceeding the hierarchy depth cap.
export async function setParent(
  userId: UserId,
  id: ItemId,
  parentId: ItemId | null,
): Promise<Item> {
  const item = await repo.findById(id, userId);
  if (!item) throw new NotFoundError("Item", id);
  if (item.user_id !== userId) throw new AuthorizationError("Not owner");
  if (item.status !== ItemStatus.Active)
    throw new StateError("Cannot reparent an archived item");

  // Un-nest → back to the root.
  if (parentId == null) {
    const cleared = await repo.update(id, userId, { parent_id: null });
    if (!cleared) throw new NotFoundError("Item", id);
    eventBus.emit("ItemReparented", {
      item: cleared,
      parent_id: null,
      reparented_at: cleared.updated_at,
    });
    return cleared;
  }

  if (parentId === id)
    throw new ValidationError("An item cannot be its own parent");

  const parent = await repo.findById(parentId, userId);
  if (!parent) throw new NotFoundError("Item", parentId);
  if (parent.user_id !== userId) throw new AuthorizationError("Not owner");
  if (parent.status !== ItemStatus.Active)
    throw new StateError("Cannot nest under an archived item");

  // Cycle guard: the proposed parent must not already sit inside this item's own
  // subtree — i.e. this item must not be an ancestor of it.
  const parentAncestors = await repo.findAncestorIds(parentId, userId);
  if (parentAncestors.includes(id))
    throw new ValidationError("That would create a cycle in the hierarchy");

  // Depth guard: root items are level 1, so the parent sits at (ancestors + 1)
  // and this item lands one below. The deepest leaf in this item's subtree must
  // still fit under the cap once it moves.
  const newLevel = parentAncestors.length + 2;
  const height = await repo.subtreeHeight(id, userId);
  if (newLevel + height > LIMITS.HIERARCHY_DEPTH_MAX) {
    throw new ValidationError(
      `Nesting would exceed the maximum depth of ${LIMITS.HIERARCHY_DEPTH_MAX}`,
      { max_depth: LIMITS.HIERARCHY_DEPTH_MAX },
    );
  }

  const updated = await repo.update(id, userId, { parent_id: parentId });
  if (!updated) throw new NotFoundError("Item", id);
  eventBus.emit("ItemReparented", {
    item: updated,
    parent_id: parentId,
    reparented_at: updated.updated_at,
  });
  return updated;
}

export async function archiveItem(userId: UserId, id: ItemId): Promise<Item> {
  const item = await repo.findById(id, userId);
  if (!item) throw new NotFoundError("Item", id);
  if (item.user_id !== userId) throw new AuthorizationError("Not owner");
  if (item.status === "Archived")
    throw new ConflictError("Item is already archived");

  const now = new Date().toISOString();
  const updated = await repo.update(id, userId, {
    status: "Archived",
    archived_at: now,
  });
  if (!updated) throw new NotFoundError("Item", id);
  eventBus.emit("ItemArchived", { item: updated, archived_at: now });
  return updated;
}

export async function restoreItem(userId: UserId, id: ItemId): Promise<Item> {
  const item = await repo.findById(id, userId);
  if (!item) throw new NotFoundError("Item", id);
  if (item.user_id !== userId) throw new AuthorizationError("Not owner");
  if (item.status !== "Archived")
    throw new ConflictError("Item is not archived");

  const updated = await repo.update(id, userId, {
    status: "Active",
    archived_at: null,
  });
  if (!updated) throw new NotFoundError("Item", id);
  eventBus.emit("ItemRestored", {
    item: updated,
    restored_at: updated.updated_at,
  });
  return updated;
}

export async function getRecentItems(
  userId: UserId,
  limit = 20,
): Promise<Item[]> {
  return repo.findActive(userId, limit);
}

export async function searchItems(
  userId: UserId,
  searchText: string,
  limit = 50,
  offset = 0,
): Promise<Item[]> {
  if (!searchText?.trim()) throw new ValidationError("Search text is required");
  return repo.search(userId, searchText.trim(), limit, offset);
}

export async function getItemsByType(
  userId: UserId,
  itemType: ItemType,
  limit = 50,
  offset = 0,
): Promise<Item[]> {
  return repo.findByType(userId, itemType, limit, offset);
}

export async function getItemsByTag(
  userId: UserId,
  tagId: string,
  limit = 50,
  offset = 0,
): Promise<Item[]> {
  return repo.findByTag(userId, tagId, limit, offset);
}

export async function getItemsByEntryType(
  userId: UserId,
  entryType: string,
  limit = 50,
  offset = 0,
): Promise<Item[]> {
  return repo.findByEntryType(userId, entryType, limit, offset);
}

export async function completeTask(
  userId: UserId,
  itemId: ItemId,
): Promise<Item> {
  const item = await repo.findById(itemId, userId);
  if (!item) throw new NotFoundError("Item", itemId);
  if (item.user_id !== userId) throw new AuthorizationError("Not owner");
  if (item.item_type !== ItemType.Task)
    throw new ValidationError("Item is not a Task");
  if (item.status !== ItemStatus.Active)
    throw new StateError("Cannot complete an archived item");

  const td = item.type_data as { task_status?: string } | null;
  if (td?.task_status === TaskStatus.Blocked) {
    throw new StateError(
      "Cannot complete a blocked task — resolve dependencies first",
    );
  }
  if (td?.task_status === TaskStatus.Done) {
    throw new ConflictError("Task is already Done");
  }

  const now = new Date().toISOString();
  const updated = await repo.update(itemId, userId, {
    type_data: { ...td, task_status: TaskStatus.Done, completed_at: now },
  });
  if (!updated) throw new NotFoundError("Item", itemId);

  eventBus.emit("TaskCompleted", { item: updated, completed_at: now });
  return updated;
}

export async function startTask(userId: UserId, itemId: ItemId): Promise<Item> {
  const item = await repo.findById(itemId, userId);
  if (!item) throw new NotFoundError("Item", itemId);
  if (item.user_id !== userId) throw new AuthorizationError("Not owner");
  if (item.item_type !== ItemType.Task)
    throw new ValidationError("Item is not a Task");
  if (item.status !== ItemStatus.Active)
    throw new StateError("Cannot start an archived item");

  const td = item.type_data as { task_status?: string } | null;
  if (td?.task_status === TaskStatus.Blocked) {
    throw new StateError(
      "Cannot start a blocked task — resolve dependencies first",
    );
  }
  if (td?.task_status === TaskStatus.Done) {
    throw new StateError("Task is already Done");
  }
  if (td?.task_status === TaskStatus.InProgress) {
    throw new ConflictError("Task is already InProgress");
  }

  const updated = await repo.update(itemId, userId, {
    type_data: { ...td, task_status: TaskStatus.InProgress },
  });
  if (!updated) throw new NotFoundError("Item", itemId);

  eventBus.emit("TaskStarted", {
    item: updated,
    started_at: updated.updated_at,
  });
  return updated;
}

export async function blockTask(userId: UserId, itemId: ItemId): Promise<Item> {
  const item = await repo.findById(itemId, userId);
  if (!item) throw new NotFoundError("Item", itemId);
  if (item.user_id !== userId) throw new AuthorizationError("Not owner");
  if (item.item_type !== ItemType.Task)
    throw new ValidationError("Item is not a Task");
  if (item.status !== ItemStatus.Active)
    throw new StateError("Cannot block an archived item");

  const td = item.type_data as { task_status?: string } | null;
  if (td?.task_status === TaskStatus.Done) {
    throw new StateError("Cannot block a completed task");
  }
  if (td?.task_status === TaskStatus.Blocked) {
    throw new ConflictError("Task is already Blocked");
  }

  const updated = await repo.update(itemId, userId, {
    type_data: { ...td, task_status: TaskStatus.Blocked },
  });
  if (!updated) throw new NotFoundError("Item", itemId);

  eventBus.emit("TaskBlocked", {
    item: updated,
    blocked_at: updated.updated_at,
  });
  return updated;
}

export async function getTrash(
  userId: UserId,
  limit = 50,
  offset = 0,
): Promise<Item[]> {
  return repo.findArchived(userId, limit, offset);
}

export async function purgeItem(userId: UserId, id: ItemId): Promise<void> {
  const item = await repo.findById(id, userId);
  if (!item) throw new NotFoundError("Item", id);
  if (item.user_id !== userId) throw new AuthorizationError("Not owner");
  if (item.status !== "Archived")
    throw new StateError("Can only purge archived items");
  const deleted = await repo.hardDelete(id, userId);
  if (!deleted) throw new NotFoundError("Item", id);
}

export async function purgeExpired(userId: UserId, days = 30): Promise<number> {
  return repo.purgeExpired(userId, days);
}

export async function createDivider(userId: UserId): Promise<Item> {
  const item = await repo.insert(userId, "", undefined, ItemType.Divider);
  return item;
}

function getTypeDefaults(type: ItemType): Record<string, unknown> {
  switch (type) {
    case ItemType.Task:
      return { task_status: "Open", priority: "Normal" };
    case ItemType.Idea:
      return { maturity: "Seed" };
    case ItemType.Note:
      return {};
    case ItemType.Reminder:
      return { is_dismissed: false };
    default:
      return {};
  }
}
