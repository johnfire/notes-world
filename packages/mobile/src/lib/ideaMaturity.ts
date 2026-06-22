import { IdeaMaturity, ItemType } from "@notes-world/shared";
import type { Item } from "@notes-world/shared";
import { colors } from "../theme";

// Maturity → colour for the idea board. The web Ideas board doesn't colour-code
// maturities, so we borrow the task-status palette to read the stage at a glance:
// nascent (gray) → active (blue) → ready (green) → parked (amber). The enum
// values (Seed/Developing/Ready/Parked) are already display-ready, so there's no
// label map — screens show the value directly.
export const MATURITY_COLORS: Record<string, string> = {
  [IdeaMaturity.Seed]: colors.statusOpen,
  [IdeaMaturity.Developing]: colors.statusInProgress,
  [IdeaMaturity.Ready]: colors.statusDone,
  [IdeaMaturity.Parked]: colors.statusOnHold,
};

// An idea with a missing or unrecognised maturity reads as Seed, matching the
// item-detail editor's default. Non-idea items return null.
export function maturityOf(item: Item): IdeaMaturity | null {
  if (item.item_type !== ItemType.Idea) return null;
  const m = (item.type_data as { maturity?: string } | null)?.maturity;
  return (Object.values(IdeaMaturity) as string[]).includes(m ?? "")
    ? (m as IdeaMaturity)
    : IdeaMaturity.Seed;
}
