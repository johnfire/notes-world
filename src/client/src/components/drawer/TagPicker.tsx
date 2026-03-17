import { Tag } from '../../types';

interface TagPickerProps {
  itemTags: Tag[];
  allTags: Tag[];
  tagSearch: string;
  setTagSearch: (s: string) => void;
  tagPickerOpen: boolean;
  setTagPickerOpen: (open: boolean | ((p: boolean) => boolean)) => void;
  isArchived: boolean;
  onAddTag: (tag: Tag) => void;
  onCreateAndAddTag: (name: string) => void;
  onRemoveTag: (tagId: string) => void;
}

export function TagPicker({
  itemTags, allTags, tagSearch, setTagSearch,
  tagPickerOpen, setTagPickerOpen, isArchived,
  onAddTag, onCreateAndAddTag, onRemoveTag,
}: TagPickerProps) {
  const availableTags = allTags.filter(
    t => !itemTags.find(it => it.id === t.id) &&
         t.name.includes(tagSearch.toLowerCase().trim())
  );
  const trimmedSearch = tagSearch.trim();
  const canCreate = trimmedSearch &&
    !allTags.find(t => t.name === trimmedSearch.toLowerCase());

  return (
    <div>
      <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">Tags</label>
      <div className="flex flex-wrap gap-1.5">
        {itemTags.map(tag => (
          <span key={tag.id} className="flex items-center gap-1 px-2 py-0.5 rounded bg-surface-600 text-accent text-xs">
            {tag.name}
            {!isArchived && (
              <button
                onClick={() => void onRemoveTag(tag.id)}
                className="text-gray-500 hover:text-white leading-none"
              >×</button>
            )}
          </span>
        ))}

        {!isArchived && (
          <div className="relative">
            <button
              onClick={() => setTagPickerOpen((p: boolean) => !p)}
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
                    if (e.key === 'Enter' && canCreate) void onCreateAndAddTag(tagSearch);
                  }}
                />
                <div className="max-h-44 overflow-y-auto">
                  {availableTags.map(tag => (
                    <button
                      key={tag.id}
                      onClick={() => void onAddTag(tag)}
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
                      onClick={() => void onCreateAndAddTag(tagSearch)}
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
  );
}
