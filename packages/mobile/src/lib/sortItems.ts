// Applies the shared /sort-orders positions (same context keys as the web
// app), so a custom order set on either platform shows up on both.
export function applySavedOrder<T extends { id: string }>(
  items: T[],
  rows: Array<{ item_id: string; sort_order: number }>,
): T[] {
  if (rows.length === 0) return items;
  const order = new Map(rows.map((r) => [r.item_id, r.sort_order]));
  return [...items].sort(
    (a, b) => (order.get(a.id) ?? Infinity) - (order.get(b.id) ?? Infinity),
  );
}

export function moveItem<T>(list: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (index < 0 || index >= list.length || target < 0 || target >= list.length)
    return list;
  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}
