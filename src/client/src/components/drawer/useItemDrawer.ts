import { useState, useEffect, useCallback } from 'react';
import { Item, Tag, Dependency } from '../../types';
import { useApp } from '../../context/AppContext';
import * as api from '../../api';

export function useItemDrawer() {
  const { state, closeItem, openItem, updateItemInContext, loadTags } = useApp();
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

  // task actions
  const [actioning, setActioning] = useState(false);

  // dependencies
  const [deps, setDeps]               = useState<Dependency[]>([]);
  const [dependents, setDependents]   = useState<Dependency[]>([]);
  const [depItems, setDepItems]       = useState<Record<string, Item>>({});
  const [depSearch, setDepSearch]     = useState('');
  const [depSearchResults, setDepSearchResults] = useState<Item[]>([]);

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

      const [fetchedDeps, fetchedDependents] = await Promise.all([
        api.dependencies.forItem(id),
        api.dependencies.dependents(id),
      ]);
      setDeps(fetchedDeps);
      setDependents(fetchedDependents);

      const idsToFetch = [
        ...fetchedDeps.map(d => d.dependency_id),
        ...fetchedDependents.map(d => d.dependent_id),
      ];
      const unique = [...new Set(idsToFetch)];
      if (unique.length > 0) {
        const depItemsList = await Promise.all(unique.map(depId => api.items.getById(depId)));
        const cache: Record<string, Item> = {};
        depItemsList.forEach(i => { cache[i.id] = i; });
        setDepItems(cache);
      } else {
        setDepItems({});
      }
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
      setDeps([]);
      setDependents([]);
      setDepItems({});
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

  async function handlePromote(newType: import('../../types').ItemType) {
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

  async function handleTaskAction(action: 'complete' | 'start' | 'block') {
    if (!item) return;
    setActioning(true);
    try {
      const updated = await api.items[action](item.id);
      setItem(updated);
      updateItemInContext(updated);
    } finally {
      setActioning(false);
    }
  }

  async function handleRemoveDep(depId: string) {
    if (!item) return;
    await api.dependencies.remove(depId);
    void loadItem(item.id);
  }

  async function handleAddDep(dependencyItemId: string) {
    if (!item) return;
    await api.dependencies.add(item.id, dependencyItemId);
    setDepSearch('');
    setDepSearchResults([]);
    void loadItem(item.id);
  }

  function handleDepSearch(q: string) {
    setDepSearch(q);
    if (!q.trim()) { setDepSearchResults([]); return; }
    const timer = setTimeout(async () => {
      const results = await api.items.search(q);
      setDepSearchResults(results.slice(0, 8));
    }, 300);
    return () => clearTimeout(timer);
  }

  return {
    // state
    selectedItemId,
    item,
    loading,
    title, setTitle,
    body, setBody,
    saving,
    itemTags,
    tagSearch, setTagSearch,
    tagPickerOpen, setTagPickerOpen,
    promoteOpen, setPromoteOpen,
    actioning,
    deps, dependents, depItems,
    depSearch, depSearchResults,
    allTags: state.tags,

    // actions
    closeItem,
    openItem,
    saveTitle,
    saveBody,
    handleAddTag,
    handleCreateAndAddTag,
    handleRemoveTag,
    handlePromote,
    handleArchive,
    handleRestore,
    handleTaskAction,
    handleRemoveDep,
    handleAddDep,
    handleDepSearch,
  };
}
