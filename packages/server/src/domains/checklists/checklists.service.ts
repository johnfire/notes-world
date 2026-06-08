// Checklists domain service — validation + business logic
import { Checklist, ChecklistItem, ChecklistId, UserId } from "../../types";
import { LIMITS } from "../../constants";
import { ValidationError, NotFoundError } from "../../utils/errors";
import * as repo from "./checklists.repository";

const TEXT_MAX = LIMITS.ITEM_TITLE_MAX; // 300 — shared limit for titles/names

function clean(value: string | undefined, field: string): string {
  const trimmed = (value ?? "").trim();
  if (!trimmed) throw new ValidationError(`${field} is required`);
  if (trimmed.length > TEXT_MAX) {
    throw new ValidationError(`${field} too long`, {
      length: trimmed.length,
      maximum: TEXT_MAX,
    });
  }
  return trimmed;
}

export async function listChecklists(userId: UserId): Promise<Checklist[]> {
  return repo.listChecklists(userId);
}

export async function getChecklist(
  userId: UserId,
  id: ChecklistId,
): Promise<Checklist> {
  const checklist = await repo.findById(id, userId);
  if (!checklist) throw new NotFoundError("Checklist", id);
  const items = await repo.findItems(id, userId);
  return { ...checklist, items };
}

export async function createChecklist(
  userId: UserId,
  title: string,
): Promise<Checklist> {
  return repo.insertChecklist(userId, clean(title, "Title"));
}

export async function renameChecklist(
  userId: UserId,
  id: ChecklistId,
  title: string,
): Promise<Checklist> {
  const updated = await repo.updateChecklist(id, userId, {
    title: clean(title, "Title"),
  });
  if (!updated) throw new NotFoundError("Checklist", id);
  return updated;
}

export async function deleteChecklist(
  userId: UserId,
  id: ChecklistId,
): Promise<void> {
  const deleted = await repo.deleteChecklist(id, userId);
  if (!deleted) throw new NotFoundError("Checklist", id);
}

export async function addItem(
  userId: UserId,
  checklistId: ChecklistId,
  name: string,
): Promise<ChecklistItem> {
  const cleanName = clean(name, "Name");
  const checklist = await repo.findById(checklistId, userId);
  if (!checklist) throw new NotFoundError("Checklist", checklistId);
  return repo.insertItem(checklistId, userId, cleanName);
}

export async function updateItem(
  userId: UserId,
  checklistId: ChecklistId,
  itemId: string,
  input: { name?: string; checked?: boolean },
): Promise<ChecklistItem> {
  const fields: { name?: string; checked?: boolean } = {};
  if (input.name !== undefined) fields.name = clean(input.name, "Name");
  if (input.checked !== undefined) {
    if (typeof input.checked !== "boolean") {
      throw new ValidationError("checked must be a boolean");
    }
    fields.checked = input.checked;
  }
  if (fields.name === undefined && fields.checked === undefined) {
    throw new ValidationError("No fields to update");
  }
  const updated = await repo.updateItem(itemId, checklistId, userId, fields);
  if (!updated) throw new NotFoundError("Checklist item", itemId);
  return updated;
}

export async function deleteItem(
  userId: UserId,
  checklistId: ChecklistId,
  itemId: string,
): Promise<void> {
  const deleted = await repo.deleteItem(itemId, checklistId, userId);
  if (!deleted) throw new NotFoundError("Checklist item", itemId);
}
