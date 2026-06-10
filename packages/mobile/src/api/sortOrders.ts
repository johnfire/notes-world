import { api } from "./client";

// Persisted via the shared sort-orders endpoint. Collapsed-divider state reuses
// it under a dedicated context key so it stays in sync with the web app.
export function getSortOrder(
  contextKey: string,
): Promise<Array<{ item_id: string; sort_order: number }>> {
  return api.get(`/sort-orders?context=${encodeURIComponent(contextKey)}`);
}

export function saveSortOrder(
  contextKey: string,
  itemIds: string[],
): Promise<void> {
  return api.put<void>("/sort-orders", {
    context_key: contextKey,
    item_ids: itemIds,
  });
}

const collapsedKey = (tagId: string) => `tag:${tagId}:collapsed`;

export const collapsedDividers = {
  get: (tagId: string): Promise<string[]> =>
    getSortOrder(collapsedKey(tagId)).then((rows) =>
      rows.map((r) => r.item_id),
    ),

  save: (tagId: string, dividerIds: string[]): Promise<void> =>
    saveSortOrder(collapsedKey(tagId), dividerIds),
};
