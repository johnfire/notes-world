// Checklists repository — raw SQL queries
import { Checklist, ChecklistItem, ChecklistId, UserId } from "../../types";
import { query, queryOne } from "../../db/client";
import { buildUpdate } from "../../utils/buildUpdate";

export async function listChecklists(userId: UserId): Promise<Checklist[]> {
  return query<Checklist>(
    `SELECT c.*,
       COUNT(ci.id)::int AS item_count,
       (COUNT(ci.id) FILTER (WHERE ci.checked))::int AS checked_count
     FROM checklists c
     LEFT JOIN checklist_items ci ON ci.checklist_id = c.id
     WHERE c.user_id = $1
     GROUP BY c.id
     ORDER BY c.sort_order ASC, LOWER(c.title) ASC`,
    [userId],
  );
}

export async function findById(
  id: ChecklistId,
  userId: UserId,
): Promise<Checklist | null> {
  return queryOne<Checklist>(
    `SELECT * FROM checklists WHERE id = $1 AND user_id = $2`,
    [id, userId],
  );
}

export async function findItems(
  checklistId: ChecklistId,
  userId: UserId,
): Promise<ChecklistItem[]> {
  return query<ChecklistItem>(
    `SELECT * FROM checklist_items
     WHERE checklist_id = $1 AND user_id = $2
     ORDER BY sort_order ASC, created_at ASC`,
    [checklistId, userId],
  );
}

export async function insertChecklist(
  userId: UserId,
  title: string,
): Promise<Checklist> {
  const rows = await query<Checklist>(
    `INSERT INTO checklists (user_id, title, sort_order)
     VALUES ($1, $2, COALESCE((SELECT MAX(sort_order) + 1 FROM checklists WHERE user_id = $1), 0))
     RETURNING *`,
    [userId, title],
  );
  return rows[0];
}

export async function updateChecklist(
  id: ChecklistId,
  userId: UserId,
  fields: { title?: string },
): Promise<Checklist | null> {
  const { sql, params } = buildUpdate(
    "checklists",
    fields,
    { id, user_id: userId },
    { allowedFields: ["title"] },
  );
  return queryOne<Checklist>(sql, params);
}

export async function deleteChecklist(
  id: ChecklistId,
  userId: UserId,
): Promise<boolean> {
  const rows = await query<{ id: string }>(
    `DELETE FROM checklists WHERE id = $1 AND user_id = $2 RETURNING id`,
    [id, userId],
  );
  return rows.length > 0;
}

export async function insertItem(
  checklistId: ChecklistId,
  userId: UserId,
  name: string,
): Promise<ChecklistItem> {
  const rows = await query<ChecklistItem>(
    `INSERT INTO checklist_items (checklist_id, user_id, name, sort_order)
     VALUES ($1, $2, $3, COALESCE((SELECT MAX(sort_order) + 1 FROM checklist_items WHERE checklist_id = $1), 0))
     RETURNING *`,
    [checklistId, userId, name],
  );
  return rows[0];
}

export async function findItemById(
  itemId: string,
  checklistId: ChecklistId,
  userId: UserId,
): Promise<ChecklistItem | null> {
  return queryOne<ChecklistItem>(
    `SELECT * FROM checklist_items WHERE id = $1 AND checklist_id = $2 AND user_id = $3`,
    [itemId, checklistId, userId],
  );
}

export async function updateItem(
  itemId: string,
  checklistId: ChecklistId,
  userId: UserId,
  fields: { name?: string; checked?: boolean },
): Promise<ChecklistItem | null> {
  const { sql, params } = buildUpdate(
    "checklist_items",
    fields,
    { id: itemId, checklist_id: checklistId, user_id: userId },
    { allowedFields: ["name", "checked"] },
  );
  return queryOne<ChecklistItem>(sql, params);
}

export async function deleteItem(
  itemId: string,
  checklistId: ChecklistId,
  userId: UserId,
): Promise<boolean> {
  const rows = await query<{ id: string }>(
    `DELETE FROM checklist_items WHERE id = $1 AND checklist_id = $2 AND user_id = $3 RETURNING id`,
    [itemId, checklistId, userId],
  );
  return rows.length > 0;
}
