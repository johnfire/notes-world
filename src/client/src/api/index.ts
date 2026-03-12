import { Item, Tag, DashboardResponse, Block, ViewType, BlockConfig, TypeData, ItemType } from '../types';

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

  tagItem: (itemId: string, tagId: string) =>
    request<void>(`/tags/item/${itemId}/${tagId}`, { method: 'POST' }),

  untagItem: (itemId: string, tagId: string) =>
    request<void>(`/tags/item/${itemId}/${tagId}`, { method: 'DELETE' }),
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
