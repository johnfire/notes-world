import { api } from "./client";
import type { TagWithCount, Item } from "@notes-world/shared";

export function listTags(): Promise<TagWithCount[]> {
  return api.get<TagWithCount[]>("/tags");
}

export function getItemsByTag(tagId: string): Promise<Item[]> {
  return api.get<Item[]>(`/tags/${tagId}/items`);
}
