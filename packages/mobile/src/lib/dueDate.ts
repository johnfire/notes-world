// Date display + sort helpers now live in @notes-world/shared so web and mobile
// share one implementation. Re-exported here to keep existing import paths.
export {
  formatDueShort,
  sortItemsByDate,
  dateOf,
  mergeTypeData,
  type DateField,
} from "@notes-world/shared";
