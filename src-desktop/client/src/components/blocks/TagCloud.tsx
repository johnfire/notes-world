import { useEffect, useState, useRef } from 'react';
import { Block } from '../../types';
import { useApp } from '../../context/AppContext';
import * as api from '../../api';

interface Props { block: Block }

export function TagCloud({ block }: Props) {
  const { state, loadTags } = useApp();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadTags(); }, [loadTags]);
  useEffect(() => { if (adding) inputRef.current?.focus(); }, [adding]);

  const tags = state.tags;
  const maxCount = tags.reduce((m, t) => Math.max(m, t.count ?? 0), 1);

  function fontSize(count: number): string {
    const ratio = (count ?? 0) / maxCount;
    if (ratio > 0.8) return 'text-base font-medium';
    if (ratio > 0.5) return 'text-sm';
    return 'text-xs';
  }

  function cancelAdding() {
    setAdding(false);
    setName('');
    setError(null);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    if (trimmed.length > 100) {
      setError('Tag name must be 100 characters or less');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.tags.create(trimmed);
      await loadTags();
      cancelAdding();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card h-full overflow-hidden flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          {block.title ?? 'Tags'}
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-600">{tags.length}</span>
          {!adding && (
            <button
              onClick={() => setAdding(true)}
              className="text-gray-500 hover:text-accent transition-colors text-sm leading-none"
              title="Create tag"
            >
              +
            </button>
          )}
        </div>
      </div>
      {adding && (
        <form onSubmit={handleCreate} className="flex items-center gap-2 mb-3">
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Escape') cancelAdding(); }}
            placeholder="Tag name…"
            maxLength={100}
            className="input text-sm flex-1 min-w-0"
            autoComplete="off"
            disabled={saving}
          />
          <button type="submit" disabled={!name.trim() || saving} className="btn-primary text-xs">
            {saving ? '…' : 'Add'}
          </button>
          <button type="button" onClick={cancelAdding} className="btn-ghost text-xs">
            Cancel
          </button>
        </form>
      )}
      {error && (
        <p className="text-xs text-red-400 mb-2">{error}</p>
      )}
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
