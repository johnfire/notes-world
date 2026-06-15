import { api } from "./client";
import type {
  Item,
  ItemType,
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

export function deleteItem(id: string): Promise<void> {
  return api.post<void>(`/items/${id}/purge`, {});
}
