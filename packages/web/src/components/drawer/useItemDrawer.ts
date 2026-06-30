import { useState, useEffect, useCallback, useRef } from "react";
import { Item, Tag, Dependency } from "../../types";
import { mergeTypeData } from "@notes-world/shared";
import { useApp } from "../../context/AppContext";
import * as api from "../../api";

export function useItemDrawer() {
  const { state, closeItem, openItem, updateItemInContext, loadTags, refresh } =
    useApp();
  const { selectedItemId } = state;

  // Saves happen on field blur / actions, not on close, so the underlying view
  // (tasks, ideas, a tag's items…) doesn't yet reflect them. Track whether
  // anything changed while the drawer was open and refresh that view on close —
  // but skip the refetch when the drawer was only opened to look, not edit.
  const dirty = useRef(false);
  const markDirtyAndUpdate = useCallback(
    (updated: Item) => {
      dirty.current = true;
      updateItemInContext(updated);
    },
    [updateItemInContext],
  );
  const handleClose = useCallback(() => {
    if (dirty.current) {
      dirty.current = false;
      void refresh();
    }
    closeItem();
  }, [refresh, closeItem]);

  const [item, setItem] = useState<Item | null>(null);
  const [itemTags, setItemTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);

  // edit state
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  // tag picker
  const [tagSearch, setTagSearch] = useState("");
  const [tagPickerOpen, setTagPickerOpen] = useState(false);

  // promote / type change
  const [promoteOpen, setPromoteOpen] = useState(false);
  // Target type awaiting a "this drops X" confirmation; null when none pending.
  const [pendingType, setPendingType] = useState<Item["item_type"] | null>(
    null,
  );

  // task actions
  const [actioning, setActioning] = useState(false);

  // dependencies
  const [deps, setDeps] = useState<Dependency[]>([]);
  const [dependents, setDependents] = useState<Dependency[]>([]);
  const [depItems, setDepItems] = useState<Record<string, Item>>({});
  const [depSearch, setDepSearch] = useState("");
  const [depSearchResults, setDepSearchResults] = useState<Item[]>([]);

  const loadItem = useCallback(async (id: string) => {
    setLoading(true);
    setTagPickerOpen(false);
    setPromoteOpen(false);
    setPendingType(null);
    try {
      const [fetched, fetchedTags] = await Promise.all([
        api.items.getById(id),
        api.tags.getTagsForItem(id),
      ]);
      setItem(fetched);
      setTitle(fetched.title);
      setBody(fetched.body ?? "");
      setItemTags(fetchedTags);

      const [fetchedDeps, fetchedDependents] = await Promise.all([
        api.dependencies.forItem(id),
        api.dependencies.dependents(id),
      ]);
      setDeps(fetchedDeps);
      setDependents(fetchedDependents);

      const idsToFetch = [
        ...fetchedDeps.map((d) => d.dependency_id),
        ...fetchedDependents.map((d) => d.dependent_id),
      ];
      const unique = [...new Set(idsToFetch)];
      if (unique.length > 0) {
        const depItemsList = await Promise.all(
          unique.map((depId) => api.items.getById(depId)),
        );
        const cache: Record<string, Item> = {};
        depItemsList.forEach((i) => {
          cache[i.id] = i;
        });
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
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedItemId, handleClose]);

  async function saveTitle() {
    if (!item || !title.trim() || title.trim() === item.title) {
      if (!title.trim()) setTitle(item?.title ?? "");
      return;
    }
    setSaving(true);
    try {
      const updated = await api.items.update(item.id, { title: title.trim() });
      setItem(updated);
      setTitle(updated.title);
      markDirtyAndUpdate(updated);
    } finally {
      setSaving(false);
    }
  }

  async function saveBody() {
    if (!item || body === (item.body ?? "")) return;
    setSaving(true);
    try {
      const updated = await api.items.update(item.id, {
        body: body || undefined,
      });
      setItem(updated);
      markDirtyAndUpdate(updated);
    } finally {
      setSaving(false);
    }
  }

  // Dates live in the type_data JSON blob, which the server replaces wholesale,
  // so we merge the change into the existing type_data. An empty value clears
  // the field. Expects a date-only "YYYY-MM-DD" string (or "" to clear).
  async function saveDate(field: "due_date" | "start_date", value: string) {
    if (!item) return;
    const merged = mergeTypeData(item.type_data, field, value);
    setSaving(true);
    try {
      const updated = await api.items.update(item.id, {
        type_data: merged as Item["type_data"],
      });
      setItem(updated);
      markDirtyAndUpdate(updated);
    } catch (err) {
      api.reportClientError({
        message: (err as Error).message,
        stack: (err as Error).stack,
        context: "useItemDrawer.saveDate",
      });
    } finally {
      setSaving(false);
    }
  }

  // Status/priority live in the type_data blob, which the server replaces
  // wholesale, so merge the change in. A null value clears the field. Callers
  // stamp/clear completed_at alongside task_status to match the complete action.
  async function saveTaskField(patch: Record<string, string | null>) {
    if (!item) return;
    const merged: Record<string, unknown> = {
      ...((item.type_data as Record<string, unknown> | null) ?? {}),
    };
    for (const [key, value] of Object.entries(patch)) {
      if (value === null) delete merged[key];
      else merged[key] = value;
    }
    setSaving(true);
    try {
      const updated = await api.items.update(item.id, {
        type_data: merged as Item["type_data"],
      });
      setItem(updated);
      markDirtyAndUpdate(updated);
    } catch (err) {
      api.reportClientError({
        message: (err as Error).message,
        stack: (err as Error).stack,
        context: "useItemDrawer.saveTaskField",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleAddTag(tag: Tag) {
    if (!item) return;
    await api.tags.tagItem(item.id, tag.id);
    dirty.current = true;
    setItemTags((prev) => [...prev, tag]);
    setTagSearch("");
    setTagPickerOpen(false);
    void loadTags();
  }

  async function handleCreateAndAddTag(name: string) {
    if (!item) return;
    const newTag = await api.tags.create(name.trim());
    await api.tags.tagItem(item.id, newTag.id);
    dirty.current = true;
    setItemTags((prev) => [...prev, newTag]);
    setTagSearch("");
    setTagPickerOpen(false);
    void loadTags();
  }

  async function handleRemoveTag(tagId: string) {
    if (!item) return;
    await api.tags.untagItem(item.id, tagId);
    dirty.current = true;
    setItemTags((prev) => prev.filter((t) => t.id !== tagId));
    void loadTags();
  }

  async function handlePromote(newType: import("../../types").ItemType) {
    if (!item) return;
    setPromoteOpen(false);
    setPendingType(null);
    const updated = await api.items.promote(item.id, newType);
    setItem(updated);
    markDirtyAndUpdate(updated);
  }

  async function handleArchive() {
    if (!item) return;
    const updated = await api.items.archive(item.id);
    setItem(updated);
    markDirtyAndUpdate(updated);
    void loadTags();
  }

  async function handleRestore() {
    if (!item) return;
    const updated = await api.items.restore(item.id);
    setItem(updated);
    markDirtyAndUpdate(updated);
    void loadTags();
  }

  async function handleTaskAction(action: "complete" | "start" | "block") {
    if (!item) return;
    setActioning(true);
    try {
      const updated = await api.items[action](item.id);
      setItem(updated);
      markDirtyAndUpdate(updated);
    } finally {
      setActioning(false);
    }
  }

  async function handleRemoveDep(depId: string) {
    if (!item) return;
    await api.dependencies.remove(depId);
    dirty.current = true;
    void loadItem(item.id);
  }

  async function handleAddDep(dependencyItemId: string) {
    if (!item) return;
    await api.dependencies.add(item.id, dependencyItemId);
    dirty.current = true;
    setDepSearch("");
    setDepSearchResults([]);
    void loadItem(item.id);
  }

  function handleDepSearch(q: string) {
    setDepSearch(q);
    if (!q.trim()) {
      setDepSearchResults([]);
      return;
    }
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
    title,
    setTitle,
    body,
    setBody,
    saving,
    itemTags,
    tagSearch,
    setTagSearch,
    tagPickerOpen,
    setTagPickerOpen,
    promoteOpen,
    setPromoteOpen,
    pendingType,
    setPendingType,
    actioning,
    deps,
    dependents,
    depItems,
    depSearch,
    depSearchResults,
    allTags: state.tags,

    // actions — closeItem refreshes the underlying view if anything changed
    closeItem: handleClose,
    openItem,
    saveTitle,
    saveBody,
    saveDate,
    saveTaskField,
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
