import { ItemType, ItemStatus, TaskStatus } from '../types';
import { linkify } from '../utils/linkify';
import { useItemDrawer } from './drawer/useItemDrawer';
import { TagPicker } from './drawer/TagPicker';
import { TaskActions } from './drawer/TaskActions';
import { DependenciesPanel } from './drawer/DependenciesPanel';

export function ItemDrawer() {
  const d = useItemDrawer();

  if (!d.selectedItemId) return null;

  const { item, loading } = d;
  const isArchived = item?.status === ItemStatus.Archived;
  const taskStatus = item?.item_type === ItemType.Task
    ? (item.type_data as { task_status?: TaskStatus } | null)?.task_status
    : undefined;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={d.closeItem} />

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
          {d.saving && <span className="text-xs text-gray-600">Saving…</span>}
          <button onClick={d.closeItem} className="text-gray-500 hover:text-white">
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
              value={d.title}
              onChange={e => d.setTitle(e.target.value)}
              onBlur={() => void d.saveTitle()}
              disabled={isArchived || d.saving}
            />

            {/* Body */}
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 block">Notes</label>
              <textarea
                className="w-full bg-surface-700 border border-surface-500 rounded-md px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-accent resize-none disabled:opacity-60"
                rows={4}
                value={d.body}
                onChange={e => d.setBody(e.target.value)}
                onBlur={() => void d.saveBody()}
                placeholder="Add notes…"
                disabled={isArchived || d.saving}
              />
              {d.body && (
                <p className="text-sm text-gray-400 mt-1.5 whitespace-pre-wrap break-all">{linkify(d.body)}</p>
              )}
            </div>

            {/* Type data */}
            {item.type_data && <TypeDataPanel item={item} />}

            {/* Task actions */}
            {item.item_type === ItemType.Task && !isArchived && (
              <TaskActions
                taskStatus={taskStatus}
                actioning={d.actioning}
                onAction={d.handleTaskAction}
              />
            )}

            {/* Dependencies */}
            {(d.deps.length > 0 || d.dependents.length > 0 || item.item_type === ItemType.Task) && (
              <DependenciesPanel
                item={item}
                deps={d.deps}
                dependents={d.dependents}
                depItems={d.depItems}
                depSearch={d.depSearch}
                depSearchResults={d.depSearchResults}
                isArchived={isArchived!}
                onOpenItem={d.openItem}
                onRemoveDep={d.handleRemoveDep}
                onAddDep={d.handleAddDep}
                onDepSearch={d.handleDepSearch}
              />
            )}

            {/* Tags */}
            <TagPicker
              itemTags={d.itemTags}
              allTags={d.allTags}
              tagSearch={d.tagSearch}
              setTagSearch={d.setTagSearch}
              tagPickerOpen={d.tagPickerOpen}
              setTagPickerOpen={d.setTagPickerOpen}
              isArchived={isArchived!}
              onAddTag={d.handleAddTag}
              onCreateAndAddTag={d.handleCreateAndAddTag}
              onRemoveTag={d.handleRemoveTag}
            />

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
                <button onClick={() => d.setPromoteOpen(p => !p)} className="btn-ghost text-xs">
                  Promote to…
                </button>
                {d.promoteOpen && (
                  <div className="absolute bottom-10 left-0 z-10 w-36 bg-surface-700 border border-surface-500 rounded-md shadow-xl overflow-hidden">
                    {[ItemType.Task, ItemType.Idea, ItemType.Note, ItemType.Reminder].map(t => (
                      <button
                        key={t}
                        onClick={() => void d.handlePromote(t)}
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
              <button onClick={() => void d.handleRestore()} className="btn-ghost text-xs text-accent">
                Restore
              </button>
            ) : (
              <button onClick={() => void d.handleArchive()} className="btn-ghost text-xs text-gray-500 hover:text-danger">
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
    [ItemType.Divider]:  'badge-untyped',
  };
  return <span className={cls[type]}>{type}</span>;
}

function TypeDataPanel({ item }: { item: import('../types').Item }) {
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
