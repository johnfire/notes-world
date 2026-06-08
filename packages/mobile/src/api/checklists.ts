import { api } from "./client";
import type { Checklist, ChecklistItem } from "@notes-world/shared";

export function listChecklists(): Promise<Checklist[]> {
  return api.get<Checklist[]>("/checklists");
}

export function getChecklist(id: string): Promise<Checklist> {
  return api.get<Checklist>(`/checklists/${id}`);
}

export function createChecklist(title: string): Promise<Checklist> {
  return api.post<Checklist>("/checklists", { title });
}

export function renameChecklist(id: string, title: string): Promise<Checklist> {
  return api.patch<Checklist>(`/checklists/${id}`, { title });
}

export function deleteChecklist(id: string): Promise<void> {
  return api.delete<void>(`/checklists/${id}`);
}

export function addChecklistItem(
  id: string,
  name: string,
): Promise<ChecklistItem> {
  return api.post<ChecklistItem>(`/checklists/${id}/items`, { name });
}

export function updateChecklistItem(
  id: string,
  itemId: string,
  data: { name?: string; checked?: boolean },
): Promise<ChecklistItem> {
  return api.patch<ChecklistItem>(`/checklists/${id}/items/${itemId}`, data);
}

export function deleteChecklistItem(id: string, itemId: string): Promise<void> {
  return api.delete<void>(`/checklists/${id}/items/${itemId}`);
}
