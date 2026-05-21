import { Item, Dependency } from '../../types';

interface DependenciesPanelProps {
  item: Item;
  deps: Dependency[];
  dependents: Dependency[];
  depItems: Record<string, Item>;
  depSearch: string;
  depSearchResults: Item[];
  isArchived: boolean;
  onOpenItem: (id: string) => void;
  onRemoveDep: (depId: string) => void;
  onAddDep: (dependencyItemId: string) => void;
  onDepSearch: (q: string) => void;
}

export function DependenciesPanel({
  item, deps, dependents, depItems, depSearch, depSearchResults,
  isArchived, onOpenItem, onRemoveDep, onAddDep, onDepSearch,
}: DependenciesPanelProps) {
  return (
    <div>
      <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">Dependencies</label>

      {/* Depends on */}
      {(deps.length > 0 || !isArchived) && (
        <div className="mb-3">
          <p className="text-xs text-gray-600 mb-1">Depends on</p>
          {deps.length === 0 ? (
            <p className="text-xs text-gray-700 italic">None</p>
          ) : (
            <div className="space-y-1">
              {deps.map(dep => (
                <div key={dep.id} className="flex items-center justify-between gap-2 text-xs">
                  <button
                    onClick={() => onOpenItem(depItems[dep.dependency_id]?.id ?? dep.dependency_id)}
                    className="text-gray-300 hover:text-white truncate text-left"
                  >
                    {depItems[dep.dependency_id]?.title ?? dep.dependency_id}
                  </button>
                  {!isArchived && (
                    <button
                      onClick={() => void onRemoveDep(dep.id)}
                      className="text-gray-600 hover:text-danger shrink-0"
                    >×</button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add dependency search */}
          {!isArchived && (
            <div className="relative mt-2">
              <input
                className="w-full bg-surface-700 border border-surface-500 rounded px-2 py-1 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-accent"
                placeholder="+ Add dependency…"
                value={depSearch}
                onChange={e => onDepSearch(e.target.value)}
              />
              {depSearchResults.length > 0 && (
                <div className="absolute left-0 top-7 z-10 w-full bg-surface-700 border border-surface-500 rounded shadow-xl overflow-hidden max-h-32 overflow-y-auto">
                  {depSearchResults.filter(r => r.id !== item.id).map(r => (
                    <button
                      key={r.id}
                      onClick={() => void onAddDep(r.id)}
                      className="w-full text-left px-2 py-1.5 text-xs text-gray-300 hover:bg-surface-600 hover:text-white truncate"
                    >
                      {r.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Depended on by */}
      {dependents.length > 0 && (
        <div>
          <p className="text-xs text-gray-600 mb-1">Blocking</p>
          <div className="space-y-1">
            {dependents.map(dep => (
              <button
                key={dep.id}
                onClick={() => onOpenItem(depItems[dep.dependent_id]?.id ?? dep.dependent_id)}
                className="w-full text-left text-xs text-gray-400 hover:text-white truncate"
              >
                {depItems[dep.dependent_id]?.title ?? dep.dependent_id}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
