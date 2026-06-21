import { useTranslation } from "react-i18next";
import { ItemType } from "../types";

const BADGE_CLASS: Record<ItemType, string> = {
  [ItemType.Task]: "badge-task",
  [ItemType.Idea]: "badge-idea",
  [ItemType.Note]: "badge-note",
  [ItemType.Reminder]: "badge-reminder",
  [ItemType.Untyped]: "badge-untyped",
  [ItemType.Divider]: "badge-untyped",
};

// Small colour-coded pill naming an item's type (note / task / idea / …) so it
// reads at a glance in lists and in the drawer header. Colours come from the
// shared type system in index.css (.badge-*).
export function ItemTypeBadge({ type }: { type: ItemType }) {
  const { t } = useTranslation();
  return (
    <span className={BADGE_CLASS[type]}>
      {t(`app.types.${type.toLowerCase()}`)}
    </span>
  );
}
