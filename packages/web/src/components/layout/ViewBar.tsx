export type AppView = 'dashboard' | 'ideas' | 'tasks';

const VIEWS: { id: AppView; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'ideas',     label: 'Ideas'     },
  { id: 'tasks',     label: 'Tasks'     },
];

interface ViewBarProps {
  currentView: AppView;
  onViewChange: (view: AppView) => void;
}

export function ViewBar({ currentView, onViewChange }: ViewBarProps) {
  return (
    <nav className="h-9 bg-surface-800 border-b border-surface-500 flex items-center px-4 gap-1 shrink-0">
      {VIEWS.map(({ id, label }) => (
        <button
          key={id}
          onClick={() => onViewChange(id)}
          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
            currentView === id
              ? 'bg-surface-600 text-white'
              : 'text-gray-400 hover:text-white hover:bg-surface-700'
          }`}
        >
          {label}
        </button>
      ))}
    </nav>
  );
}
