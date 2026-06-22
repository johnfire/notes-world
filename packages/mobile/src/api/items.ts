import { api } from "./client";
import { ItemType } from "@notes-world/shared";
import type {
  Item,
  ItemStatus,
  PaginatedResult,
  TypeData,
} from "@notes-world/shared";

export interface ItemsQuery {
  page?: number;
  page_size?: number;
  search?: string;
  item_type?: ItemType;
  status?: ItemStatus;
}

export function listItems(
  query: ItemsQuery = {},
): Promise<PaginatedResult<Item>> {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.page_size) params.set("page_size", String(query.page_size));
  if (query.search) params.set("search", query.search);
  if (query.item_type) params.set("item_type", query.item_type);
  if (query.status) params.set("status", query.status);
  const qs = params.toString();
  return api.get<PaginatedResult<Item>>(`/items${qs ? `?${qs}` : ""}`);
}

export function getItem(id: string): Promise<Item> {
  return api.get<Item>(`/items/${id}`);
}

// All items of a type for the user, across every tag and untagged. Used by the
// Done view to gather completed tasks regardless of how they're tagged.
export function getItemsByType(
  type: ItemType,
  limit = 200,
  offset = 0,
): Promise<Item[]> {
  return api.get<Item[]>(`/items/type/${type}?limit=${limit}&offset=${offset}`);
}

// Every task for the user, across all tags and untagged, paged in full (the
// server caps a page at 200). The task board buckets these by status client-side
// — the same approach the Done view uses to gather completed tasks.
export async function fetchAllTasks(): Promise<Item[]> {
  const PAGE = 200;
  const MAX_PAGES = 50; // runaway-loop safety stop
  const tasks: Item[] = [];
  for (let p = 0; p < MAX_PAGES; p++) {
    const batch = await getItemsByType(ItemType.Task, PAGE, p * PAGE);
    tasks.push(...batch);
    if (batch.length < PAGE) break;
  }
  return tasks;
}

export interface CreateItemInput {
  title: string;
  body?: string;
  item_type?: ItemType;
}

export function createItem(input: CreateItemInput): Promise<Item> {
  return api.post<Item>("/items", input);
}

export interface UpdateItemInput {
  title?: string;
  body?: string;
  item_type?: ItemType;
  // Hex color (e.g. "#ef4444") or null to clear.
  color?: string | null;
  // Replaces the whole type_data JSON blob server-side — callers must send the
  // merged object (existing fields + changes), not just the changed keys.
  type_data?: TypeData;
}

export function updateItem(id: string, input: UpdateItemInput): Promise<Item> {
  return api.patch<Item>(`/items/${id}`, input);
}

export function archiveItem(id: string): Promise<Item> {
  return api.post<Item>(`/items/${id}/archive`, {});
}

// Promote an item to a concrete type (server seeds type_data defaults).
export function promoteItem(id: string, newType: ItemType): Promise<Item> {
  return api.post<Item>(`/items/${id}/promote`, { new_type: newType });
}

// Nest an item under another, or pass null to move it back to the top level.
export function setParent(id: string, parentId: string | null): Promise<Item> {
  return api.post<Item>(`/items/${id}/parent`, { parent_id: parentId });
}

export function createDivider(): Promise<Item> {
  return api.post<Item>("/items/divider", {});
}

// Archived items (Trash). Recoverable until purged (server auto-purges at 30d).
export function getTrash(limit = 50, offset = 0): Promise<Item[]> {
  return api.get<Item[]>(`/items/trash?limit=${limit}&offset=${offset}`);
}

export function restoreItem(id: string): Promise<Item> {
  return api.post<Item>(`/items/${id}/restore`, {});
}

export function deleteItem(id: string): Promise<void> {
  return api.post<void>(`/items/${id}/purge`, {});
}
