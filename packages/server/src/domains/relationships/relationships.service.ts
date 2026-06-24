import {
  Tag,
  TagId,
  UserId,
  ItemId,
  TagWithCount as SharedTagWithCount,
} from "../../types";
import { eventBus } from "../../events/eventBus";
import { LIMITS, FREE_TAGS_MAX } from "../../constants";
import {
  ValidationError,
  NotFoundError,
  ConflictError,
  AuthorizationError,
  LimitExceeded,
} from "../../utils/errors";
import * as repo from "./relationships.repository";
import * as itemRepo from "../items/items.repository";
import * as itemService from "../items/items.service";
import * as authRepo from "../auth/auth.repository";
import { logger } from "../../utils/logger";
import { TagWithCount } from "./relationships.types";

function normalizeName(name: string): string {
  return name.toLowerCase().trim();
}

export async function createTag(userId: UserId, name: string): Promise<Tag> {
  const normalized = normalizeName(name);
  if (!normalized) throw new ValidationError("Tag name is required");
  if (normalized.length > LIMITS.TAG_NAME_MAX) {
    throw new ValidationError("Tag name too long", {
      length: normalized.length,
      maximum: LIMITS.TAG_NAME_MAX,
    });
  }

  const existing = await repo.findTagByName(normalized, userId);
  if (existing) throw new ConflictError(`Tag "${normalized}" already exists`);

  const user = await authRepo.findUserById(userId);
  if (user?.role === "free") {
    const count = await repo.countTagsForUser(userId);
    if (count >= FREE_TAGS_MAX) {
      throw new LimitExceeded(
        `Free plan is limited to ${FREE_TAGS_MAX} tags. Upgrade to create more.`,
      );
    }
  }

  return repo.insertTag(normalized, userId);
}

export async function renameTag(
  userId: UserId,
  tagId: TagId,
  newName: string,
): Promise<Tag> {
  const tag = await repo.findTagById(tagId, userId);
  if (!tag) throw new NotFoundError("Tag", tagId);
  if (tag.user_id !== userId) throw new AuthorizationError("Not owner");

  const normalized = normalizeName(newName);
  if (!normalized) throw new ValidationError("Tag name is required");

  const conflict = await repo.findTagByName(normalized, userId);
  if (conflict && conflict.id !== tagId)
    throw new ConflictError(`Tag "${normalized}" already exists`);

  const updated = await repo.updateTagName(tagId, userId, normalized);
  if (!updated) throw new NotFoundError("Tag", tagId);
  return updated;
}

export async function updateTagColor(
  userId: UserId,
  tagId: TagId,
  color: string | null,
): Promise<Tag> {
  const tag = await repo.findTagById(tagId, userId);
  if (!tag) throw new NotFoundError("Tag", tagId);
  if (tag.user_id !== userId) throw new AuthorizationError("Not owner");

  const updated = await repo.updateTagColor(tagId, userId, color);
  if (!updated) throw new NotFoundError("Tag", tagId);
  return updated;
}

export async function deleteTag(
  userId: UserId,
  tagId: TagId,
  deleteItems = false,
): Promise<void> {
  const tag = await repo.findTagById(tagId, userId);
  if (!tag) throw new NotFoundError("Tag", tagId);
  if (tag.user_id !== userId) throw new AuthorizationError("Not owner");

  // Archive the attached notes first (while item_tags still links them), then
  // drop the tag (item_tags cascade). Order matters: deleting the tag first
  // would remove the links we use to find the notes.
  if (deleteItems) {
    await repo.archiveItemsForTag(tagId, userId);
  }
  await repo.deleteTag(tagId, userId);
  eventBus.emit("TagDeleted", {
    tag_id: tag.id,
    tag_name: tag.name,
    deleted_at: new Date().toISOString(),
  });
}

export async function getAllTags(
  userId: UserId,
): Promise<SharedTagWithCount[]> {
  return repo.findAllTags(userId);
}

export async function getTagsForItem(
  userId: UserId,
  itemId: ItemId,
): Promise<Tag[]> {
  return repo.findTagsForItem(itemId, userId);
}

export async function getTagUsageCounts(
  userId: UserId,
  color?: string | null,
): Promise<TagWithCount[]> {
  return repo.findTagUsageCounts(userId, color);
}

export async function tagItem(
  userId: UserId,
  itemId: ItemId,
  tagId: TagId,
): Promise<void> {
  const item = await itemRepo.findById(itemId, userId);
  if (!item) throw new NotFoundError("Item", itemId);
  if (item.user_id !== userId) throw new AuthorizationError("Not owner");

  const tag = await repo.findTagById(tagId, userId);
  if (!tag) throw new NotFoundError("Tag", tagId);
  if (tag.user_id !== userId) throw new AuthorizationError("Not owner");

  const tagCount = await repo.countTagsOnItem(itemId);
  if (tagCount >= LIMITS.TAGS_PER_ITEM_MAX) {
    throw new LimitExceeded("Item has too many tags", {
      current_count: tagCount,
      maximum: LIMITS.TAGS_PER_ITEM_MAX,
    });
  }

  await repo.insertItemTag(itemId, tagId, userId);
  eventBus.emit("ItemTagged", {
    item,
    tag,
    tagged_at: new Date().toISOString(),
  });

  // Best-effort: let an Untyped item adopt the tag's prevailing type. This is an
  // enhancement on top of the tag link, so a failure here must never fail the
  // tag operation itself — the link and event above have already happened.
  try {
    await itemService.inheritTypeFromTag(userId, item, tagId);
  } catch (err) {
    logger.warn("Tag type inheritance failed; item left untyped", {
      item_id: itemId,
      tag_id: tagId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

export async function untagItem(
  userId: UserId,
  itemId: ItemId,
  tagId: TagId,
): Promise<void> {
  const item = await itemRepo.findById(itemId, userId);
  if (!item) throw new NotFoundError("Item", itemId);
  if (item.user_id !== userId) throw new AuthorizationError("Not owner");

  await repo.deleteItemTag(itemId, tagId);
  const tag = await repo.findTagById(tagId, userId);
  if (tag) {
    eventBus.emit("ItemUntagged", {
      item,
      tag,
      untagged_at: new Date().toISOString(),
    });
  }
}

export async function getTagsForItems(
  userId: UserId,
  itemIds: ItemId[],
): Promise<Record<string, Tag[]>> {
  return repo.findTagsForItems(itemIds, userId);
}

export async function getItemsForTag(
  userId: UserId,
  tagId: TagId,
  limit = 50,
  offset = 0,
) {
  return itemRepo.findByTag(userId, tagId, limit, offset);
}

export async function findOrCreateTag(
  userId: UserId,
  name: string,
): Promise<Tag> {
  const normalized = normalizeName(name);
  const existing = await repo.findTagByName(normalized, userId);
  if (existing) return existing;
  return repo.insertTag(normalized, userId);
}
