import { useEffect, useState } from "react";
import { Checklist, ChecklistItem } from "../types";
import { sortChecklistItems } from "@notes-world/shared";
import * as api from "../api";

export function ChecklistsView() {
  const [lists, setLists] = useState<Checklist[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.checklists
      .list()
      .then(setLists)
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(title: string) {
    const created = await api.checklists.create(title);
    setLists((prev) => [
      ...prev,
      { ...created, item_count: 0, checked_count: 0 },
    ]);
    setSelectedId(created.id);
  }

  async function handleDeleteList(id: string) {
    await api.checklists.remove(id);
    setLists((prev) => prev.filter((l) => l.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  if (selectedId) {
    return (
      <ChecklistDetail
        checklistId={selectedId}
        onBack={() => setSelectedId(null)}
        onDeleted={() => handleDeleteList(selectedId)}
        onRenamed={(title) =>
          setLists((prev) =>
            prev.map((l) => (l.id === selectedId ? { ...l, title } : l)),
          )
        }
      />
    );
  }

  return (
    <div className="p-4 h-full overflow-y-auto">
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
        Lists
      </h2>
      <NewListInput onCreate={handleCreate} placeholder="New list name…" />
      {loading ? (
        <p className="text-sm text-gray-600 py-8 text-center">Loading…</p>
      ) : lists.length === 0 ? (
        <p className="text-sm text-gray-600 py-8 text-center">
          No lists yet. Create one above.
        </p>
      ) : (
        <div className="flex flex-col gap-2 mt-3">
          {lists.map((l) => (
            <button
              key={l.id}
              onClick={() => setSelectedId(l.id)}
              className="card hover:border-surface-400 hover:bg-surface-600 transition-colors py-2 px-3 flex items-center justify-between text-left"
            >
              <span className="text-sm text-gray-200">{l.title}</span>
              <span className="text-xs text-gray-500">
                {l.checked_count ?? 0}/{l.item_count ?? 0}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function NewListInput({
  onCreate,
  placeholder,
}: {
  onCreate: (value: string) => void;
  placeholder: string;
}) {
  const [value, setValue] = useState("");
  function submit() {
    const trimmed = value.trim();
    if (!trimmed) return;
    onCreate(trimmed);
    setValue("");
  }
  return (
    <div className="flex gap-2">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder={placeholder}
        className="flex-1 bg-surface-700 border border-surface-500 rounded px-3 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-accent"
      />
      <button
        onClick={submit}
        className="px-3 py-1.5 rounded text-xs font-medium bg-surface-600 text-white hover:bg-surface-500 transition-colors"
      >
        Add
      </button>
    </div>
  );
}

function ChecklistDetail({
  checklistId,
  onBack,
  onDeleted,
  onRenamed,
}: {
  checklistId: string;
  onBack: () => void;
  onDeleted: () => void;
  onRenamed: (title: string) => void;
}) {
  const [checklist, setChecklist] = useState<Checklist | null>(null);
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.checklists
      .get(checklistId)
      .then((c) => {
        setChecklist(c);
        setItems(c.items ?? []);
      })
      .finally(() => setLoading(false));
  }, [checklistId]);

  async function toggle(item: ChecklistItem) {
    const updated = await api.checklists.updateItem(checklistId, item.id, {
      checked: !item.checked,
    });
    setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
  }

  async function addItem(name: string) {
    const created = await api.checklists.addItem(checklistId, name);
    setItems((prev) => [...prev, created]);
  }

  async function removeItem(id: string) {
    await api.checklists.removeItem(checklistId, id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  async function rename() {
    const next = window.prompt("Rename list", checklist?.title);
    if (!next?.trim()) return;
    const updated = await api.checklists.rename(checklistId, next.trim());
    setChecklist(updated);
    onRenamed(updated.title);
  }

  function deleteList() {
    if (!window.confirm("Delete this list and all its items?")) return;
    onDeleted();
  }

  return (
    <div className="p-4 h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={onBack}
            className="text-xs text-gray-500 hover:text-gray-300 px-2 py-1 rounded hover:bg-surface-600"
          >
            ← Lists
          </button>
          <h2 className="text-sm font-medium text-gray-200 truncate">
            {checklist?.title ?? ""}
          </h2>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={rename}
            className="text-xs text-gray-500 hover:text-gray-300 px-2 py-1 rounded hover:bg-surface-600"
          >
            Rename
          </button>
          <button
            onClick={deleteList}
            className="text-xs text-gray-500 hover:text-red-400 px-2 py-1 rounded hover:bg-surface-600"
          >
            Delete
          </button>
        </div>
      </div>

      <NewListInput onCreate={addItem} placeholder="Add item…" />

      {loading ? (
        <p className="text-sm text-gray-600 py-8 text-center">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-600 py-8 text-center">
          No items yet. Add one above.
        </p>
      ) : (
        <div className="flex flex-col gap-2 mt-3">
          {sortChecklistItems(items).map((item) => (
            <div
              key={item.id}
              className="card hover:border-surface-400 hover:bg-surface-600 transition-colors py-2 px-3 flex items-center gap-3 group"
            >
              <input
                type="checkbox"
                checked={item.checked}
                onChange={() => toggle(item)}
                className="w-4 h-4 accent-accent cursor-pointer shrink-0"
              />
              <span
                className={`flex-1 text-sm min-w-0 ${
                  item.checked ? "text-gray-500 line-through" : "text-gray-200"
                }`}
              >
                {item.name}
              </span>
              <button
                onClick={() => removeItem(item.id)}
                className="text-gray-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 shrink-0 text-sm"
                title="Remove"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
