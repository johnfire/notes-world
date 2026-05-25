import { api } from "./client";
import type { TagWithCount, Tag, Item } from "@notes-world/shared";

export function listTags(): Promise<TagWithCount[]> {
  return api.get<TagWithCount[]>("/tags");
}

export function getItemsByTag(tagId: string): Promise<Item[]> {
  return api.get<Item[]>(`/tags/${tagId}/items`);
}

export function getTagsForItem(itemId: string): Promise<Tag[]> {
  return api.get<Tag[]>(`/tags/item/${itemId}`);
}

export function addTagToItem(itemId: string, tagId: string): Promise<void> {
  return api.post<void>(`/tags/item/${itemId}/${tagId}`, {});
}

export function removeTagFromItem(
  itemId: string,
  tagId: string,
): Promise<void> {
  return api.delete<void>(`/tags/item/${itemId}/${tagId}`);
}
