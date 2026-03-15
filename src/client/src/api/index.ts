import { Item, Tag, DashboardResponse, Block, ViewType, BlockConfig, TypeData, ItemType, Dependency, ImportJob, ImportRecord } from '../types';

const BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body?.error?.message ?? `HTTP ${res.status}`);
    (err as Error & { code?: string }).code = body?.error?.code;
    throw err;
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ── Items ────────────────────────────────────────────────────────────────────

export const items = {
  capture: (title: string, body?: string) =>
    request<Item>('/items', { method: 'POST', body: JSON.stringify({ title, body }) }),

  getById: (id: string) =>
    request<Item>(`/items/${id}`),

  update: (id: string, data: { title?: string; body?: string; type_data?: TypeData }) =>
    request<Item>(`/items/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  promote: (id: string, new_type: ItemType, type_data?: TypeData) =>
    request<Item>(`/items/${id}/promote`, { method: 'POST', body: JSON.stringify({ new_type, type_data }) }),

  archive: (id: string) =>
    request<Item>(`/items/${id}/archive`, { method: 'POST' }),

  restore: (id: string) =>
    request<Item>(`/items/${id}/restore`, { method: 'POST' }),

  search: (q: string, limit = 50, offset = 0) =>
    request<Item[]>(`/items/search?q=${encodeURIComponent(q)}&limit=${limit}&offset=${offset}`),

  recent: (limit = 20) =>
    request<Item[]>(`/items/recent?limit=${limit}`),

  byType: (type: ItemType, limit = 50, offset = 0) =>
    request<Item[]>(`/items/type/${type}?limit=${limit}&offset=${offset}`),

  byEntryType: (entryType: string, limit = 50, offset = 0) =>
    request<Item[]>(`/items/entry/${encodeURIComponent(entryType)}?limit=${limit}&offset=${offset}`),

  complete: (id: string) =>
    request<Item>(`/items/${id}/complete`, { method: 'POST' }),

  start: (id: string) =>
    request<Item>(`/items/${id}/start`, { method: 'POST' }),

  block: (id: string) =>
    request<Item>(`/items/${id}/block`, { method: 'POST' }),

  createDivider: () =>
    request<Item>('/items/divider', { method: 'POST' }),
};

// ── Dependencies ─────────────────────────────────────────────────────────────

export const dependencies = {
  forItem: (itemId: string) =>
    request<Dependency[]>(`/items/${itemId}/dependencies`),

  dependents: (itemId: string) =>
    request<Dependency[]>(`/items/${itemId}/dependents`),

  add: (dependentId: string, dependencyId: string) =>
    request<Dependency>(`/items/${dependentId}/dependencies`, {
      method: 'POST',
      body: JSON.stringify({ dependency_id: dependencyId }),
    }),

  remove: (depId: string) =>
    request<void>(`/dependencies/${depId}`, { method: 'DELETE' }),
};

// ── Tags ─────────────────────────────────────────────────────────────────────

export const tags = {
  getAll: () =>
    request<Tag[]>('/tags'),

  getUsageCounts: () =>
    request<Tag[]>('/tags/usage'),

  create: (name: string) =>
    request<Tag>('/tags', { method: 'POST', body: JSON.stringify({ name }) }),

  rename: (id: string, new_name: string) =>
    request<Tag>(`/tags/${id}`, { method: 'PATCH', body: JSON.stringify({ new_name }) }),

  delete: (id: string) =>
    request<void>(`/tags/${id}`, { method: 'DELETE' }),

  getItemsForTag: (id: string, limit = 50, offset = 0) =>
    request<Item[]>(`/tags/${id}/items?limit=${limit}&offset=${offset}`),

  getTagsForItem: (itemId: string) =>
    request<Tag[]>(`/tags/item/${itemId}`),

  getTagsForItems: (itemIds: string[]) =>
    request<Record<string, Tag[]>>(`/tags/items/batch?ids=${itemIds.join(',')}`),

  tagItem: (itemId: string, tagId: string) =>
    request<void>(`/tags/item/${itemId}/${tagId}`, { method: 'POST' }),

  untagItem: (itemId: string, tagId: string) =>
    request<void>(`/tags/item/${itemId}/${tagId}`, { method: 'DELETE' }),
};

// ── Sort Orders ───────────────────────────────────────────────────────────────

export const sortOrders = {
  get: (contextKey: string) =>
    request<Array<{ item_id: string; sort_order: number }>>(`/sort-orders?context=${encodeURIComponent(contextKey)}`),

  save: (contextKey: string, itemIds: string[]) =>
    request<void>('/sort-orders', {
      method: 'PUT',
      body: JSON.stringify({ context_key: contextKey, item_ids: itemIds }),
    }),
};

// ── Dashboard ─────────────────────────────────────────────────────────────────

export const dashboard = {
  get: () =>
    request<DashboardResponse>('/dashboard'),

  addBlock: (dashboardId: string, data: { view_type: ViewType; title?: string; row: number; column: number; config?: BlockConfig }) =>
    request<Block>(`/dashboard/${dashboardId}/blocks`, { method: 'POST', body: JSON.stringify(data) }),

  updateBlock: (blockId: string, data: { view_type?: ViewType; title?: string; row?: number; column?: number; config?: BlockConfig }) =>
    request<Block>(`/dashboard/blocks/${blockId}`, { method: 'PATCH', body: JSON.stringify(data) }),

  removeBlock: (blockId: string) =>
    request<void>(`/dashboard/blocks/${blockId}`, { method: 'DELETE' }),

  reorderBlocks: (positions: Array<{ block_id: string; row: number; column: number }>) =>
    request<void>('/dashboard/blocks/reorder', { method: 'PUT', body: JSON.stringify({ positions }) }),
};

// ── Import ────────────────────────────────────────────────────────────────────

export const importApi = {
  create: (source_filename: string, source_size: number, auto_tag?: string) =>
    request<ImportJob>('/import', {
      method: 'POST',
      body: JSON.stringify({ source_filename, source_size, auto_tag }),
    }),

  execute: (id: string, content: string) =>
    request<ImportJob>(`/import/${id}/execute`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  folder: (files: Array<{ path: string; content: string }>) =>
    request<ImportJob>('/import/folder', {
      method: 'POST',
      body: JSON.stringify({ files }),
    }),

  list: () =>
    request<ImportJob[]>('/import'),

  get: (id: string) =>
    request<{ job: ImportJob; records: ImportRecord[] }>(`/import/${id}`),
};
