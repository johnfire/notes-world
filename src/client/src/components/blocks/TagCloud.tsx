import { useEffect } from 'react';
import { Block } from '../../types';
import { useApp } from '../../context/AppContext';

interface Props { block: Block }

export function TagCloud({ block }: Props) {
  const { state, loadTags } = useApp();

  useEffect(() => { loadTags(); }, [loadTags]);

  const tags = state.tags;
  const maxCount = tags.reduce((m, t) => Math.max(m, t.count ?? 0), 1);

  function fontSize(count: number): string {
    const ratio = (count ?? 0) / maxCount;
    if (ratio > 0.8) return 'text-base font-medium';
    if (ratio > 0.5) return 'text-sm';
    return 'text-xs';
  }

  return (
    <div className="card h-full overflow-hidden flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          {block.title ?? 'Tags'}
        </h3>
        <span className="text-xs text-gray-600">{tags.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {tags.length === 0 ? (
          <p className="text-sm text-gray-600 py-2 text-center">No tags yet</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag.id}
                className={`${fontSize(tag.count ?? 0)} px-2 py-1 rounded bg-surface-600 text-accent hover:bg-surface-500 cursor-pointer transition-colors`}
                title={`${tag.count ?? 0} items`}
              >
                {tag.name}
                {tag.count !== undefined && (
                  <span className="ml-1 text-gray-600 text-xs">{tag.count}</span>
                )}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
