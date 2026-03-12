import { useState, useEffect, useCallback } from 'react';
import { Item, Tag, ItemType, ItemStatus } from '../types';
import { useApp } from '../context/AppContext';
import * as api from '../api';

export function ItemDrawer() {
  const { state, closeItem, updateItemInContext, loadTags } = useApp();
  const { selectedItemId } = state;

  const [item, setItem]       = useState<Item | null>(null);
  const [itemTags, setItemTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);

  // edit state
  const [title, setTitle]   = useState('');
  const [body, setBody]     = useState('');
  const [saving, setSaving] = useState(false);

  // tag picker
  const [tagSearch, setTagSearch]     = useState('');
  const [tagPickerOpen, setTagPickerOpen] = useState(false);

  // promote
  const [promoteOpen, setPromoteOpen] = useState(false);

  const loadItem = useCallback(async (id: string) => {
    setLoading(true);
    setTagPickerOpen(false);
    setPromoteOpen(false);
    try {
      const [fetched, fetchedTags] = await Promise.all([
        api.items.getById(id),
        api.tags.getTagsForItem(id),
      ]);
      setItem(fetched);
      setTitle(fetched.title);
      setBody(fetched.body ?? '');
      setItemTags(fetchedTags);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedItemId) {
      void loadItem(selectedItemId);
    } else {
      setItem(null);
      setItemTags([]);
    }
  }, [selectedItemId, loadItem]);

  // Escape to close
  useEffect(() => {
    if (!selectedItemId) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeItem();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedItemId, closeItem]);

  async function saveTitle() {
    if (!item || !title.trim() || title.trim() === item.title) {
      if (!title.trim()) setTitle(item?.title ?? '');
      return;
    }
    setSaving(true);
    try {
      const updated = await api.items.update(item.id, { title: title.trim() });
      setItem(updated);
      setTitle(updated.title);
      updateItemInContext(updated);
    } finally {
      setSaving(false);
    }
  }

  async function saveBody() {
    if (!item || body === (item.body ?? '')) return;
    setSaving(true);
    try {
      const updated = await api.items.update(item.id, { body: body || undefined });
      setItem(updated);
      updateItemInContext(updated);
    } finally {
      setSaving(false);
    }
  }

  async function handleAddTag(tag: Tag) {
    if (!item) return;
    await api.tags.tagItem(item.id, tag.id);
    setItemTags(prev => [...prev, tag]);
    setTagSearch('');
    setTagPickerOpen(false);
    void loadTags();
  }

  async function handleCreateAndAddTag(name: string) {
    if (!item) return;
    const newTag = await api.tags.create(name.trim());
    await api.tags.tagItem(item.id, newTag.id);
    setItemTags(prev => [...prev, newTag]);
    setTagSearch('');
    setTagPickerOpen(false);
    void loadTags();
  }

  async function handleRemoveTag(tagId: string) {
    if (!item) return;
    await api.tags.untagItem(item.id, tagId);
    setItemTags(prev => prev.filter(t => t.id !== tagId));
    void loadTags();
  }

  async function handlePromote(newType: ItemType) {
    if (!item) return;
    setPromoteOpen(false);
    const updated = await api.items.promote(item.id, newType);
    setItem(updated);
    updateItemInContext(updated);
  }

  async function handleArchive() {
    if (!item) return;
    const updated = await api.items.archive(item.id);
    setItem(updated);
    updateItemInContext(updated);
  }

  async function handleRestore() {
    if (!item) return;
    const updated = await api.items.restore(item.id);
    setItem(updated);
    updateItemInContext(updated);
  }

  if (!selectedItemId) return null;

  const isArchived = item?.status === ItemStatus.Archived;
  const availableTags = state.tags.filter(
    t => !itemTags.find(it => it.id === t.id) &&
         t.name.includes(tagSearch.toLowerCase().trim())
  );
  const trimmedSearch = tagSearch.trim();
  const canCreate = trimmedSearch &&
    !state.tags.find(t => t.name === trimmedSearch.toLowerCase());

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={closeItem} />

      {/* Drawer */}
      <aside className="fixed right-0 top-0 h-full w-96 max-w-full bg-surface-800 border-l border-surface-500 z-50 flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-surface-500 shrink-0">
          {!loading && item && (
            <>
              <TypeBadge type={item.item_type} />
              {isArchived && (
                <span className="badge bg-surface-500 text-gray-500">Archived</span>
              )}
            </>
          )}
          <div className="flex-1" />
          {saving && <span className="text-xs text-gray-600">Saving…</span>}
          <button onClick={closeItem} className="text-gray-500 hover:text-white">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        {loading ? (
          <div className="flex-1 p-5 space-y-4">
            <div className="h-7 w-3/4 bg-surface-600 rounded animate-pulse" />
            <div className="h-4 w-full bg-surface-600 rounded animate-pulse" />
            <div className="h-4 w-2/3 bg-surface-600 rounded animate-pulse" />
          </div>
        ) : item ? (
          <div className="flex-1 overflow-y-auto p-5 space-y-5">

            {/* Title */}
            <input
              className="w-full bg-transparent text-lg font-semibold text-white border-0 border-b border-transparent focus:border-accent focus:outline-none pb-1 transition-colors disabled:opacity-60"
              value={title}
              onChange={e => setTitle(e.target.value)}
              onBlur={() => void saveTitle()}
              disabled={isArchived || saving}
            />

            {/* Body */}
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 block">Notes</label>
              <textarea
                className="w-full bg-surface-700 border border-surface-500 rounded-md px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-accent resize-none disabled:opacity-60"
                rows={4}
                value={body}
                onChange={e => setBody(e.target.value)}
                onBlur={() => void saveBody()}
                placeholder="Add notes…"
                disabled={isArchived || saving}
              />
            </div>

            {/* Type data */}
            {item.type_data && <TypeDataPanel item={item} />}

            {/* Tags */}
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">Tags</label>
              <div className="flex flex-wrap gap-1.5">
                {itemTags.map(tag => (
                  <span key={tag.id} className="flex items-center gap-1 px-2 py-0.5 rounded bg-surface-600 text-accent text-xs">
                    {tag.name}
                    {!isArchived && (
                      <button
                        onClick={() => void handleRemoveTag(tag.id)}
                        className="text-gray-500 hover:text-white leading-none"
                      >×</button>
                    )}
                  </span>
                ))}

                {!isArchived && (
                  <div className="relative">
                    <button
                      onClick={() => setTagPickerOpen(p => !p)}
                      className="px-2 py-0.5 rounded border border-dashed border-surface-400 text-gray-500 hover:text-white text-xs transition-colors"
                    >
                      + tag
                    </button>

                    {tagPickerOpen && (
                      <div className="absolute left-0 top-7 z-10 w-52 bg-surface-700 border border-surface-500 rounded-md shadow-xl overflow-hidden">
                        <input
                          autoFocus
                          className="w-full bg-surface-600 px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none border-b border-surface-500"
                          placeholder="Search or create…"
                          value={tagSearch}
                          onChange={e => setTagSearch(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Escape') { setTagPickerOpen(false); setTagSearch(''); }
                            if (e.key === 'Enter' && canCreate) void handleCreateAndAddTag(tagSearch);
                          }}
                        />
                        <div className="max-h-44 overflow-y-auto">
                          {availableTags.map(tag => (
                            <button
                              key={tag.id}
                              onClick={() => void handleAddTag(tag)}
                              className="w-full text-left px-3 py-1.5 text-sm text-gray-300 hover:bg-surface-600 hover:text-white flex items-center justify-between"
                            >
                              <span>{tag.name}</span>
                              {tag.count !== undefined && (
                                <span className="text-xs text-gray-600">{tag.count}</span>
                              )}
                            </button>
                          ))}
                          {canCreate && (
                            <button
                              onClick={() => void handleCreateAndAddTag(tagSearch)}
                              className="w-full text-left px-3 py-1.5 text-sm text-accent hover:bg-surface-600"
                            >
                              Create "{trimmedSearch}"
                            </button>
                          )}
                          {availableTags.length === 0 && !canCreate && (
                            <p className="px-3 py-2 text-xs text-gray-600">
                              {tagSearch ? 'No matching tags' : 'All tags applied'}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Meta */}
            <div className="text-xs text-gray-600 space-y-1 pt-2 border-t border-surface-600">
              <div>Created {new Date(item.created_at).toLocaleString()}</div>
              <div>Updated {new Date(item.updated_at).toLocaleString()}</div>
            </div>
          </div>
        ) : null}

        {/* Footer */}
        {item && !loading && (
          <div className="px-5 py-3 border-t border-surface-500 flex items-center gap-2 shrink-0">
            {/* Promote — only for Untyped, active items */}
            {!isArchived && item.item_type === ItemType.Untyped && (
              <div className="relative">
                <button onClick={() => setPromoteOpen(p => !p)} className="btn-ghost text-xs">
                  Promote to…
                </button>
                {promoteOpen && (
                  <div className="absolute bottom-10 left-0 z-10 w-36 bg-surface-700 border border-surface-500 rounded-md shadow-xl overflow-hidden">
                    {[ItemType.Task, ItemType.Idea, ItemType.Note, ItemType.Reminder].map(t => (
                      <button
                        key={t}
                        onClick={() => void handlePromote(t)}
                        className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-surface-600 hover:text-white"
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex-1" />

            {isArchived ? (
              <button onClick={() => void handleRestore()} className="btn-ghost text-xs text-accent">
                Restore
              </button>
            ) : (
              <button onClick={() => void handleArchive()} className="btn-ghost text-xs text-gray-500 hover:text-danger">
                Archive
              </button>
            )}
          </div>
        )}
      </aside>
    </>
  );
}

function TypeBadge({ type }: { type: ItemType }) {
  const cls: Record<ItemType, string> = {
    [ItemType.Task]:     'badge-task',
    [ItemType.Idea]:     'badge-idea',
    [ItemType.Note]:     'badge-note',
    [ItemType.Reminder]: 'badge-reminder',
    [ItemType.Untyped]:  'badge-untyped',
  };
  return <span className={cls[type]}>{type}</span>;
}

function TypeDataPanel({ item }: { item: Item }) {
  const td = item.type_data as Record<string, string | undefined> | null;
  if (!td) return null;

  const rows: Array<[string, string | undefined]> = [];

  if (item.item_type === ItemType.Task) {
    rows.push(['Status', td.task_status]);
    rows.push(['Priority', td.priority]);
    if (td.due_date) rows.push(['Due', new Date(td.due_date).toLocaleDateString()]);
    if (td.completed_at) rows.push(['Completed', new Date(td.completed_at).toLocaleDateString()]);
  } else if (item.item_type === ItemType.Idea) {
    rows.push(['Maturity', td.maturity]);
  } else if (item.item_type === ItemType.Reminder) {
    if (td.remind_at) rows.push(['Remind at', new Date(td.remind_at).toLocaleString()]);
    rows.push(['Dismissed', td.is_dismissed === 'true' ? 'Yes' : 'No']);
  }

  if (rows.length === 0) return null;

  return (
    <div className="bg-surface-700 rounded-md p-3 space-y-1.5">
      {rows.map(([label, value]) => (
        <div key={label} className="flex gap-3 text-xs">
          <span className="text-gray-500 w-20 shrink-0">{label}</span>
          <span className="text-gray-300">{value ?? '—'}</span>
        </div>
      ))}
    </div>
  );
}
