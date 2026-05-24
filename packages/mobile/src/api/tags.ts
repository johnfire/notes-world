import { api } from "./client";
import type { TagWithCount, PaginatedResult, Item } from "@notes-world/shared";

export function listTags(): Promise<TagWithCount[]> {
  return api.get<TagWithCount[]>("/tags");
}

export function getItemsByTag(tagId: string): Promise<PaginatedResult<Item>> {
  return api.get<PaginatedResult<Item>>(`/tags/${tagId}/items`);
}
