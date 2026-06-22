import { useTranslation } from "react-i18next";

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

interface ViewBarProps {
  currentView: AppView;
  onViewChange: (view: AppView) => void;
}

export function ViewBar({ currentView, onViewChange }: ViewBarProps) {
  const { t } = useTranslation();
  return (
    <nav
      className="h-9 bg-surface-800 border-b border-surface-500 flex items-center px-4 gap-1 shrink-0"
      data-tour="viewbar"
    >
      {VIEW_IDS.map((id) => (
        <button
          key={id}
          onClick={() => onViewChange(id)}
          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
            currentView === id
              ? "bg-surface-600 text-white"
              : "text-gray-400 hover:text-white hover:bg-surface-700"
          }`}
        >
          {t(`app.views.${id}`)}
        </button>
      ))}
    </nav>
  );
}
