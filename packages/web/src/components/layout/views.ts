// The set of top-level dashboard views. Kept in its own module (not ViewBar.tsx)
// so the component file only exports a component — required for React fast refresh.

export type AppView =
  | "dashboard"
  | "ideas"
  | "tasks"
  | "notes"
  | "checklists"
  | "done"
  | "untyped";

export const VIEW_IDS: AppView[] = [
  "dashboard",
  "ideas",
  "tasks",
  "notes",
  "checklists",
  "done",
  "untyped",
];
