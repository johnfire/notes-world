// Pure helpers for the item hierarchy (parent_id tree) used by the tag list's
// drag-to-nest. Deliberately free of React/state so the order maths can be
// unit-tested without simulating HTML5 drag-and-drop.

export interface HierItem {
  id: string;
  parent_id?: string | null;
}

// An item plus all its descendants in depth-first order; siblings follow the
// given flat order (orderIds). This is the contiguous block that moves together
// when the item is dragged.
export function subtreeIds(
  items: HierItem[],
  orderIds: string[],
  rootId: string,
): string[] {
  const ids = new Set(items.map((i) => i.id));
  const childrenOf = new Map<string, string[]>();
  for (const i of items) {
    const pid = i.parent_id;
    if (pid && ids.has(pid)) {
      const arr = childrenOf.get(pid);
      if (arr) arr.push(i.id);
      else childrenOf.set(pid, [i.id]);
    }
  }
  const orderIndex = new Map(orderIds.map((id, idx) => [id, idx]));
  const out: string[] = [];
  const walk = (id: string) => {
    out.push(id);
    const kids = (childrenOf.get(id) ?? [])
      .slice()
      .sort((a, b) => (orderIndex.get(a) ?? 0) - (orderIndex.get(b) ?? 0));
    kids.forEach(walk);
  };
  walk(rootId);
  return out;
}

// The new flat order after dropping `fromId`'s subtree relative to `targetId`:
//   "into"   → placed as `target`'s last child,
//   "before" → placed just above `target` (as its sibling).
// The whole subtree moves contiguously so the flat list stays a valid
// depth-first tree. Returns the order unchanged for a no-op or a drop into the
// item's own subtree.
export function treeDropOrder(
  items: HierItem[],
  orderIds: string[],
  fromId: string,
  targetId: string,
  mode: "into" | "before",
): string[] {
  if (fromId === targetId) return orderIds;
  const block = subtreeIds(items, orderIds, fromId);
  if (block.includes(targetId)) return orderIds;

  const without = orderIds.filter((id) => !block.includes(id));
  let insertAt: number;
  if (mode === "into") {
    const targetBlock = subtreeIds(items, orderIds, targetId).filter(
      (id) => !block.includes(id),
    );
    insertAt = Math.max(...targetBlock.map((id) => without.indexOf(id)), -1) + 1;
  } else {
    insertAt = without.indexOf(targetId);
  }
  if (insertAt < 0) insertAt = without.length;
  return [...without.slice(0, insertAt), ...block, ...without.slice(insertAt)];
}
