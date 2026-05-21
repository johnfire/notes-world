import archiver from "archiver";
import { PassThrough } from "stream";
import { Item, ItemType, UserId, TagId } from "../../types";
import * as itemRepo from "../items/items.repository";
import * as relRepo from "../relationships/relationships.repository";
import { NotFoundError } from "../../utils/errors";

export const EXPORT_SCHEMA = "notes-world";
export const EXPORT_VERSION = "1.0";

function csvCell(value: unknown): string {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

export async function exportJson(userId: UserId): Promise<object> {
  const items = await itemRepo.findAllForExport(userId);
  const tags = await relRepo.findAllTags(userId);
  const tagMap =
    items.length > 0
      ? await relRepo.findTagsForItems(
          items.map((i) => i.id),
          userId,
        )
      : {};

  return {
    schema: EXPORT_SCHEMA,
    version: EXPORT_VERSION,
    exported_at: new Date().toISOString(),
    tags: tags.map((t) => ({ name: t.name, color: t.color ?? null })),
    items: items.map((item) => ({
      title: item.title,
      body: item.body ?? null,
      item_type: item.item_type,
      status: item.status,
      type_data: item.type_data ?? null,
      color: item.color ?? null,
      created_at: item.created_at,
      updated_at: item.updated_at,
      archived_at: item.archived_at ?? null,
      tags: (tagMap[item.id] ?? []).map((t) => t.name),
    })),
  };
}

export async function exportCsv(userId: UserId): Promise<string> {
  const items = await itemRepo.findAllForExport(userId);
  const tagMap =
    items.length > 0
      ? await relRepo.findTagsForItems(
          items.map((i) => i.id),
          userId,
        )
      : {};

  const header =
    "title,body,item_type,status,task_status,priority,due_date,maturity,color,tags,created_at,updated_at";

  const rows = items.map((item) => {
    const td = (item.type_data ?? {}) as Record<string, unknown>;
    const tags = (tagMap[item.id] ?? []).map((t) => t.name).join(";");
    return [
      item.title,
      item.body ?? "",
      item.item_type,
      item.status,
      td.task_status ?? "",
      td.priority ?? "",
      td.due_date ?? "",
      td.maturity ?? "",
      item.color ?? "",
      tags,
      item.created_at,
      item.updated_at,
    ]
      .map(csvCell)
      .join(",");
  });

  return [header, ...rows].join("\n");
}

interface TaskTypeData {
  task_status?: string;
  priority?: string;
  due_date?: string;
}

interface IdeaTypeData {
  maturity?: string;
}

interface ReminderTypeData {
  remind_at?: string;
  is_dismissed?: boolean;
}

function colorComment(color?: string | null): string {
  return color ? ` <!-- color: ${color} -->` : "";
}

function formatItem(item: Item): string {
  const td = item.type_data as Record<string, unknown> | null;
  const cc = colorComment(item.color);

  switch (item.item_type) {
    case ItemType.Task: {
      const t = td as TaskTypeData | null;
      const meta: string[] = [];
      if (t?.task_status) meta.push(t.task_status);
      if (t?.priority && t.priority !== "Normal")
        meta.push(`${t.priority} priority`);
      if (t?.due_date) meta.push(`due ${t.due_date}`);
      const checkbox = t?.task_status === "Done" ? "[x]" : "[ ]";
      const suffix = meta.length ? ` (${meta.join(", ")})` : "";
      return `- ${checkbox} ${item.title}${suffix}${cc}`;
    }
    case ItemType.Idea: {
      const i = td as IdeaTypeData | null;
      const suffix = i?.maturity ? ` (${i.maturity})` : "";
      return `- ${item.title}${suffix}${cc}`;
    }
    case ItemType.Reminder: {
      const r = td as ReminderTypeData | null;
      const suffix = r?.remind_at ? ` (remind: ${r.remind_at})` : "";
      return `- ${item.title}${suffix}${cc}`;
    }
    default:
      return `- ${item.title}${cc}`;
  }
}

function formatDivider(item: Item): string {
  const cc = colorComment(item.color);
  if (item.title) {
    return `## ${item.title}${cc}`;
  }
  return `---${cc}`;
}

function itemsToMarkdown(heading: string, items: Item[]): string {
  const lines: string[] = [`# ${heading}`, ""];

  for (const item of items) {
    if (item.item_type === ItemType.Divider) {
      lines.push("");
      lines.push(formatDivider(item));
      lines.push("");
      continue;
    }
    lines.push(formatItem(item));
    if (item.body) {
      const bodyLines = item.body.split("\n");
      for (const bl of bodyLines) {
        lines.push(`  ${bl}`);
      }
    }
  }

  lines.push("");
  return lines.join("\n");
}

export async function exportTag(
  userId: UserId,
  tagId: TagId,
): Promise<{ filename: string; markdown: string }> {
  const tag = await relRepo.findTagById(tagId, userId);
  if (!tag) throw new NotFoundError("Tag", tagId);

  const items = await itemRepo.findByTag(userId, tagId, 10000, 0);
  const markdown = itemsToMarkdown(tag.name, items);
  const filename = `${tag.name.replace(/[^a-z0-9_-]/gi, "_")}.md`;

  return { filename, markdown };
}

export async function exportUntagged(
  userId: UserId,
): Promise<{ filename: string; markdown: string }> {
  const items = await itemRepo.findUntagged(userId, 10000, 0);
  const markdown = itemsToMarkdown("Untagged Items", items);
  return { filename: "untagged.md", markdown };
}

export async function exportAll(userId: UserId): Promise<PassThrough> {
  const tags = await relRepo.findAllTags(userId);
  const untaggedItems = await itemRepo.findUntagged(userId, 10000, 0);

  const archive = archiver("zip", { zlib: { level: 9 } });
  const stream = new PassThrough();
  archive.pipe(stream);

  for (const tag of tags) {
    const items = await itemRepo.findByTag(userId, tag.id, 10000, 0);
    if (items.length === 0) continue;
    const md = itemsToMarkdown(tag.name, items);
    const filename = `${tag.name.replace(/[^a-z0-9_-]/gi, "_")}.md`;
    archive.append(md, { name: filename });
  }

  if (untaggedItems.length > 0) {
    const md = itemsToMarkdown("Untagged Items", untaggedItems);
    archive.append(md, { name: "untagged.md" });
  }

  void archive.finalize();
  return stream;
}
