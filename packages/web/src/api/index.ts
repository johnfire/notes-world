import {
  Item,
  Tag,
  DashboardResponse,
  Block,
  ViewType,
  BlockConfig,
  TypeData,
  ItemType,
  Dependency,
  ImportJob,
  ImportRecord,
  Checklist,
  ChecklistItem,
} from "../types";
import { decodeHideCompleted, encodeHideCompleted } from "@notes-world/shared";

const BASE = "/api";

let _accessToken: string | null = null;
export function setAccessToken(token: string | null) {
  _accessToken = token;
}

// Coalesces concurrent refresh attempts into one in-flight request.
let _refreshPromise: Promise<string | null> | null = null;

async function tryRefreshToken(): Promise<string | null> {
  if (_refreshPromise) return _refreshPromise;
  _refreshPromise = fetch("/api/auth/refresh", {
    method: "POST",
    credentials: "include",
  })
    .then((r) => (r.ok ? r.json() : null))
    .then((data: { access_token: string } | null) => {
      const token = data?.access_token ?? null;
      _accessToken = token;
      return token;
    })
    .finally(() => {
      _refreshPromise = null;
    });
  return _refreshPromise;
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (_accessToken) headers["Authorization"] = `Bearer ${_accessToken}`;
  const res = await fetch(`${BASE}${url}`, {
    headers: {
      ...headers,
      ...(options?.headers as Record<string, string> | undefined),
    },
    credentials: "include",
    ...options,
  });
  if (res.status === 401 || res.status === 403) {
    // Token likely expired — try a silent refresh and retry once.
    const newToken = await tryRefreshToken();
    if (newToken) {
      const retryHeaders: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${newToken}`,
        ...(options?.headers as Record<string, string> | undefined),
      };
      const retryRes = await fetch(`${BASE}${url}`, {
        ...options,
        headers: retryHeaders,
        credentials: "include",
      });
      if (!retryRes.ok) {
        const body = await retryRes.json().catch(() => ({}));
        const err = new Error(
          body?.error?.message ?? `HTTP ${retryRes.status}`,
        );
        (err as Error & { code?: string }).code = body?.error?.code;
        throw err;
      }
      if (retryRes.status === 204) return undefined as T;
      return retryRes.json();
    }
    // Refresh failed — surface the original error so callers can handle auth loss.
    const body = await res.json().catch(() => ({}));
    const err = new Error(body?.error?.message ?? `HTTP ${res.status}`);
    (err as Error & { code?: string }).code = body?.error?.code;
    throw err;
  }
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
    request<Item>("/items", {
      method: "POST",
      body: JSON.stringify({ title, body }),
    }),

  getById: (id: string) => request<Item>(`/items/${id}`),

  update: (
    id: string,
    data: {
      title?: string;
      body?: string;
      type_data?: TypeData;
      color?: string | null;
    },
  ) =>
    request<Item>(`/items/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  promote: (id: string, new_type: ItemType, type_data?: TypeData) =>
    request<Item>(`/items/${id}/promote`, {
      method: "POST",
      body: JSON.stringify({ new_type, type_data }),
    }),

  archive: (id: string) =>
    request<Item>(`/items/${id}/archive`, { method: "POST" }),

  restore: (id: string) =>
    request<Item>(`/items/${id}/restore`, { method: "POST" }),

  search: (q: string, limit = 50, offset = 0) =>
    request<Item[]>(
      `/items/search?q=${encodeURIComponent(q)}&limit=${limit}&offset=${offset}`,
    ),

  recent: (limit = 20) => request<Item[]>(`/items/recent?limit=${limit}`),

  byType: (type: ItemType, limit = 50, offset = 0) =>
    request<Item[]>(`/items/type/${type}?limit=${limit}&offset=${offset}`),

  byEntryType: (entryType: string, limit = 50, offset = 0) =>
    request<Item[]>(
      `/items/entry/${encodeURIComponent(entryType)}?limit=${limit}&offset=${offset}`,
    ),

  complete: (id: string) =>
    request<Item>(`/items/${id}/complete`, { method: "POST" }),

  start: (id: string) =>
    request<Item>(`/items/${id}/start`, { method: "POST" }),

  block: (id: string) =>
    request<Item>(`/items/${id}/block`, { method: "POST" }),

  createDivider: () => request<Item>("/items/divider", { method: "POST" }),

  trash: (limit = 50, offset = 0) =>
    request<Item[]>(`/items/trash?limit=${limit}&offset=${offset}`),

  purge: (id: string) =>
    request<void>(`/items/${id}/purge`, { method: "POST" }),

  purgeExpired: () =>
    request<{ purged: number }>("/items/purge-expired", { method: "POST" }),
};

// ── Checklists ─────────────────────────────────────────────────────────────

export const checklists = {
  list: () => request<Checklist[]>("/checklists"),

  get: (id: string) => request<Checklist>(`/checklists/${id}`),

  create: (title: string) =>
    request<Checklist>("/checklists", {
      method: "POST",
      body: JSON.stringify({ title }),
    }),

  rename: (id: string, title: string) =>
    request<Checklist>(`/checklists/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ title }),
    }),

  remove: (id: string) =>
    request<void>(`/checklists/${id}`, { method: "DELETE" }),

  addItem: (id: string, name: string) =>
    request<ChecklistItem>(`/checklists/${id}/items`, {
      method: "POST",
      body: JSON.stringify({ name }),
    }),

  updateItem: (
    id: string,
    itemId: string,
    data: { name?: string; checked?: boolean },
  ) =>
    request<ChecklistItem>(`/checklists/${id}/items/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  removeItem: (id: string, itemId: string) =>
    request<void>(`/checklists/${id}/items/${itemId}`, { method: "DELETE" }),
};

// ── Dependencies ─────────────────────────────────────────────────────────────

export const dependencies = {
  forItem: (itemId: string) =>
    request<Dependency[]>(`/items/${itemId}/dependencies`),

  dependents: (itemId: string) =>
    request<Dependency[]>(`/items/${itemId}/dependents`),

  add: (dependentId: string, dependencyId: string) =>
    request<Dependency>(`/items/${dependentId}/dependencies`, {
      method: "POST",
      body: JSON.stringify({ dependency_id: dependencyId }),
    }),

  remove: (depId: string) =>
    request<void>(`/dependencies/${depId}`, { method: "DELETE" }),
};

// ── Tags ─────────────────────────────────────────────────────────────────────

export const tags = {
  getAll: () => request<Tag[]>("/tags"),

  getUsageCounts: () => request<Tag[]>("/tags/usage"),

  create: (name: string) =>
    request<Tag>("/tags", { method: "POST", body: JSON.stringify({ name }) }),

  rename: (id: string, new_name: string) =>
    request<Tag>(`/tags/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ new_name }),
    }),

  setColor: (id: string, color: string | null) =>
    request<Tag>(`/tags/${id}/color`, {
      method: "PATCH",
      body: JSON.stringify({ color }),
    }),

  delete: (id: string, deleteItems = false) =>
    request<void>(`/tags/${id}${deleteItems ? "?deleteItems=true" : ""}`, {
      method: "DELETE",
    }),

  getItemsForTag: (id: string, limit = 50, offset = 0) =>
    request<Item[]>(`/tags/${id}/items?limit=${limit}&offset=${offset}`),

  getTagsForItem: (itemId: string) => request<Tag[]>(`/tags/item/${itemId}`),

  getTagsForItems: (itemIds: string[]) =>
    request<Record<string, Tag[]>>(
      `/tags/items/batch?ids=${itemIds.join(",")}`,
    ),

  tagItem: (itemId: string, tagId: string) =>
    request<void>(`/tags/item/${itemId}/${tagId}`, { method: "POST" }),

  untagItem: (itemId: string, tagId: string) =>
    request<void>(`/tags/item/${itemId}/${tagId}`, { method: "DELETE" }),
};

// ── Sort Orders ───────────────────────────────────────────────────────────────

export const sortOrders = {
  get: (contextKey: string) =>
    request<Array<{ item_id: string; sort_order: number }>>(
      `/sort-orders?context=${encodeURIComponent(contextKey)}`,
    ),

  save: (contextKey: string, itemIds: string[]) =>
    request<void>("/sort-orders", {
      method: "PUT",
      body: JSON.stringify({ context_key: contextKey, item_ids: itemIds }),
    }),
};

// ── Collapsed Dividers ────────────────────────────────────────────────────

export const collapsedDividers = {
  get: (tagId: string) =>
    sortOrders
      .get(`tag:${tagId}:collapsed`)
      .then((rows) => rows.map((r) => r.item_id)),

  save: (tagId: string, dividerIds: string[]) =>
    sortOrders.save(`tag:${tagId}:collapsed`, dividerIds),
};

// ── Hide-completed toggle (per tag) ────────────────────────────────────────
// Persisted on the sort-orders endpoint under its own context key, the same way
// sort order and collapsed dividers are. Default is ON — see decodeHideCompleted.

export const hideCompleted = {
  get: (tagId: string) =>
    sortOrders
      .get(`tag:${tagId}:hide-completed`)
      .then((rows) => decodeHideCompleted(rows)),

  save: (tagId: string, hidden: boolean) =>
    sortOrders.save(`tag:${tagId}:hide-completed`, encodeHideCompleted(hidden)),
};

// ── Dashboard ─────────────────────────────────────────────────────────────────

export const dashboard = {
  get: () => request<DashboardResponse>("/dashboard"),

  addBlock: (
    dashboardId: string,
    data: {
      view_type: ViewType;
      title?: string;
      row: number;
      column: number;
      config?: BlockConfig;
    },
  ) =>
    request<Block>(`/dashboard/${dashboardId}/blocks`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateBlock: (
    blockId: string,
    data: {
      view_type?: ViewType;
      title?: string;
      row?: number;
      column?: number;
      config?: BlockConfig;
    },
  ) =>
    request<Block>(`/dashboard/blocks/${blockId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  removeBlock: (blockId: string) =>
    request<void>(`/dashboard/blocks/${blockId}`, { method: "DELETE" }),

  reorderBlocks: (
    positions: Array<{ block_id: string; row: number; column: number }>,
  ) =>
    request<void>("/dashboard/blocks/reorder", {
      method: "PUT",
      body: JSON.stringify({ positions }),
    }),
};

// ── Billing ───────────────────────────────────────────────────────────────────

export const billing = {
  checkout: (plan: "monthly" | "annual", couponCode?: string) =>
    request<{ url: string }>("/billing/checkout", {
      method: "POST",
      body: JSON.stringify({ plan, couponCode }),
    }),

  portal: () => request<{ url: string }>("/billing/portal", { method: "POST" }),

  validateCoupon: (code: string) =>
    request<{ valid: boolean; description: string }>(
      "/billing/validate-coupon",
      {
        method: "POST",
        body: JSON.stringify({ code }),
      },
    ),
};

// ── Admin ─────────────────────────────────────────────────────────────────────

import type { User, UserRole } from "../types";

export type Coupon = {
  code: string;
  stripe_coupon_id: string;
  description: string;
  active: boolean;
  created_at: string;
};

export const admin = {
  createUser: (data: { email: string; password: string; role: UserRole }) =>
    request<User>("/admin/users", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  listUsers: () => request<User[]>("/admin/users"),
  setRole: (userId: string, role: UserRole) =>
    request<User>(`/admin/users/${userId}/role`, {
      method: "PUT",
      body: JSON.stringify({ role }),
    }),
  resetPassword: (userId: string, password: string) =>
    request<void>(`/admin/users/${userId}/password`, {
      method: "PUT",
      body: JSON.stringify({ password }),
    }),
  setDisabled: (userId: string, disabled: boolean) =>
    request<User>(`/admin/users/${userId}/disabled`, {
      method: "PATCH",
      body: JSON.stringify({ disabled }),
    }),
  listCoupons: () => request<Coupon[]>("/admin/coupons"),
  createCoupon: (data: {
    code: string;
    stripe_coupon_id: string;
    description: string;
  }) =>
    request<Coupon>("/admin/coupons", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateCoupon: (
    code: string,
    data: Partial<Pick<Coupon, "stripe_coupon_id" | "description" | "active">>,
  ) =>
    request<Coupon>(`/admin/coupons/${code}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  deleteCoupon: (code: string) =>
    request<void>(`/admin/coupons/${code}`, { method: "DELETE" }),
};

// ── API Keys ──────────────────────────────────────────────────────────────────

export type ApiKey = {
  user_id: string;
  name: string;
  key_prefix: string;
  created_at: string;
};

export const apiKeys = {
  list: () => request<ApiKey[]>("/auth/api-keys"),
  create: (name?: string) =>
    request<ApiKey & { key: string }>("/auth/api-keys", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
  revoke: (prefix: string) =>
    request<void>(`/auth/api-keys/${prefix}`, { method: "DELETE" }),
};

// ── Import ────────────────────────────────────────────────────────────────────

export const importApi = {
  create: (source_filename: string, source_size: number, auto_tag?: string) =>
    request<ImportJob>("/import", {
      method: "POST",
      body: JSON.stringify({ source_filename, source_size, auto_tag }),
    }),

  execute: (id: string, content: string) =>
    request<ImportJob>(`/import/${id}/execute`, {
      method: "POST",
      body: JSON.stringify({ content }),
    }),

  folder: (files: Array<{ path: string; content: string }>) =>
    request<ImportJob>("/import/folder", {
      method: "POST",
      body: JSON.stringify({ files }),
    }),

  list: () => request<ImportJob[]>("/import"),

  get: (id: string) =>
    request<{ job: ImportJob; records: ImportRecord[] }>(`/import/${id}`),
};

// ── Client Error Reporting ───────────────────────────────────────────────────

const APP_VERSION = "0.1.0";

// Fire-and-forget crash/error reporter. Uses bare fetch (not request<T>) so a
// failure here can never throw back into an error handler and loop. Never
// rejects — best-effort only.
export function reportClientError(report: {
  message: string;
  context?: string;
  stack?: string;
}): void {
  try {
    void fetch(`${BASE}/client-errors`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      keepalive: true,
      body: JSON.stringify({
        app: "web",
        appVersion: APP_VERSION,
        platform: "web",
        url: typeof location !== "undefined" ? location.href : undefined,
        userAgent:
          typeof navigator !== "undefined" ? navigator.userAgent : undefined,
        ...report,
      }),
    }).catch(() => {});
  } catch {
    // swallow — reporting must never crash the app
  }
}

// ── Bug Reports ────────────────────────────────────────────────────────────────

export const bugReports = {
  submit: (data: { description: string; page?: string; userAgent?: string }) =>
    request<{ number: number; url: string }>("/bug-reports", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};
