import { ItemType } from "@notes-world/shared";
import type { Item } from "@notes-world/shared";

// Items are in document order. Each non-divider item "belongs" to the most recent
// divider above it (or null if it appears before any divider). Mirrors the web
// TagView grouping so collapse behavior matches across platforms.
export function getParentDividerMap(items: Item[]): Map<string, string | null> {
  const map = new Map<string, string | null>();
  let currentDivider: string | null = null;
  for (const item of items) {
    if (item.item_type === ItemType.Divider) {
      currentDivider = item.id;
    } else {
      map.set(item.id, currentDivider);
    }
  }
  return map;
}

// Number of non-divider items under each divider — shown next to a collapsed
// divider as "(count)".
export function getHiddenCounts(items: Item[]): Map<string, number> {
  const counts = new Map<string, number>();
  let currentDivider: string | null = null;
  for (const item of items) {
    if (item.item_type === ItemType.Divider) {
      currentDivider = item.id;
    } else if (currentDivider) {
      counts.set(currentDivider, (counts.get(currentDivider) ?? 0) + 1);
    }
  }
  return counts;
}
