import { ChecklistItem } from "../types";

/**
 * Order checklist items so unchecked ones appear before checked ones, each group
 * keeping its stored sort_order. Display-only: it does not change sort_order on
 * the server, so checking an item simply drops it to the bottom and unchecking
 * returns it to its place.
 */
export function sortChecklistItems<
  T extends Pick<ChecklistItem, "checked" | "sort_order">,
>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    if (a.checked !== b.checked) return a.checked ? 1 : -1;
    return a.sort_order - b.sort_order;
  });
}
