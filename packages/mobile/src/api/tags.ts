import { api } from "./client";
import type { TagWithCount, Tag, Item } from "@notes-world/shared";

export function listTags(): Promise<TagWithCount[]> {
  return api.get<TagWithCount[]>("/tags");
}

export function getItemsByTag(tagId: string): Promise<Item[]> {
  return api.get<Item[]>(`/tags/${tagId}/items`);
}

// Deletes the tag. By default item_tags cascade server-side and the notes are
// untouched; pass deleteItems to also archive (→ Trash) the attached notes.
export function deleteTag(
  tagId: string,
  deleteItems = false,
): Promise<void> {
  const qs = deleteItems ? "?deleteItems=true" : "";
  return api.delete<void>(`/tags/${tagId}${qs}`);
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
