import { useEffect } from 'react';
import { Block, Item, ItemType } from '../../types';
import { useApp } from '../../context/AppContext';

interface Props { block: Block }

function typeClass(type: ItemType): string {
  switch (type) {
    case ItemType.Task:     return 'badge-task';
    case ItemType.Idea:     return 'badge-idea';
    case ItemType.Note:     return 'badge-note';
    case ItemType.Reminder: return 'badge-reminder';
    default:                return 'badge-untyped';
  }
}

function ItemRow({ item }: { item: Item }) {
  const { openItem } = useApp();
  const ago = (() => {
    const diff = Date.now() - new Date(item.updated_at).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  })();

  return (
    <button onClick={() => openItem(item.id)} className="w-full text-left flex items-start gap-3 py-2 border-b border-surface-500 last:border-0 group cursor-pointer hover:bg-surface-600 -mx-4 px-4 transition-colors">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-200 truncate group-hover:text-white">{item.title}</p>
        {item.body && <p className="text-xs text-gray-500 truncate mt-0.5">{item.body}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className={typeClass(item.item_type)}>{item.item_type}</span>
        <span className="text-xs text-gray-600">{ago}</span>
      </div>
    </button>
  );
}

export function RecentItems({ block }: Props) {
  const { state, loadRecentItems } = useApp();

  useEffect(() => { loadRecentItems(); }, [loadRecentItems]);

  const limit = block.config?.limit ?? 20;
  const items = state.recentItems.slice(0, limit);

  return (
    <div className="card h-full overflow-hidden flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          {block.title ?? 'Recent Items'}
        </h3>
        <span className="text-xs text-gray-600">{items.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto -mx-4 px-4">
        {items.length === 0 ? (
          <p className="text-sm text-gray-600 py-4 text-center">No items yet</p>
        ) : (
          items.map((item) => <ItemRow key={item.id} item={item} />)
        )}
      </div>
    </div>
  );
}
