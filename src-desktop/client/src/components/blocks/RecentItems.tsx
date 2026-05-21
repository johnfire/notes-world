import { useEffect, useState } from 'react';
import { Block, Item, ItemType, Tag } from '../../types';
import { useApp } from '../../context/AppContext';
import * as api from '../../api';

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

function ItemRow({ item, tags }: { item: Item; tags: Tag[] }) {
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
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {tags.map(t => (
              <span key={t.id} className="text-xs px-1.5 py-0.5 rounded bg-surface-600 text-accent">{t.name}</span>
            ))}
          </div>
        )}
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
  const [tagMap, setTagMap] = useState<Record<string, Tag[]>>({});

  useEffect(() => { loadRecentItems(); }, [loadRecentItems]);

  const limit = block.config?.limit ?? 20;
  const items = state.recentItems.slice(0, limit);

  useEffect(() => {
    if (items.length === 0) return;
    api.tags.getTagsForItems(items.map(i => i.id)).then(setTagMap);
  }, [state.recentItems, limit]);

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
          items.map((item) => <ItemRow key={item.id} item={item} tags={tagMap[item.id] ?? []} />)
        )}
      </div>
    </div>
  );
}
