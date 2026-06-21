// Pure helpers for rendering the item hierarchy (parent_id tree) in the tag
// list. Kept free of React so they can be unit-tested. Mirrors the web logic.

export interface HierItem {
  id: string;
  parent_id?: string | null;
}

// Depth of each item (0 = top level). Items whose parent isn't in the set float
// to the top level; the server guards against cycles so this terminates.
export function computeDepths(items: HierItem[]): Map<string, number> {
  const byId = new Map(items.map((i) => [i.id, i]));
  const depth = new Map<string, number>();
  const of = (it: HierItem): number => {
    const cached = depth.get(it.id);
    if (cached !== undefined) return cached;
    const parent = it.parent_id ? byId.get(it.parent_id) : undefined;
    const d = parent ? of(parent) + 1 : 0;
    depth.set(it.id, d);
    return d;
  };
  items.forEach(of);
  return depth;
}

// Items that have at least one child in the set — these get a collapse chevron.
export function parentsWithChildren(items: HierItem[]): Set<string> {
  const ids = new Set(items.map((i) => i.id));
  const parents = new Set<string>();
  for (const i of items) {
    if (i.parent_id && ids.has(i.parent_id)) parents.add(i.parent_id);
  }
  return parents;
}

// Ids hidden because one of their ancestors is collapsed.
export function hiddenByCollapse(
  items: HierItem[],
  collapsed: Set<string>,
): Set<string> {
  const byId = new Map(items.map((i) => [i.id, i]));
  const hidden = new Set<string>();
  for (const item of items) {
    let pid = item.parent_id ?? null;
    while (pid && byId.has(pid)) {
      if (collapsed.has(pid)) {
        hidden.add(item.id);
        break;
      }
      pid = byId.get(pid)?.parent_id ?? null;
    }
  }
  return hidden;
}
