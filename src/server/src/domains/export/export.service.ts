import { Item, ItemType, UserId, TagId } from '../../types';
import * as itemRepo from '../items/items.repository';
import * as relRepo from '../relationships/relationships.repository';
import { NotFoundError } from '../../utils/errors';

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

function formatItem(item: Item): string {
  const td = item.type_data as Record<string, unknown> | null;

  switch (item.item_type) {
    case ItemType.Task: {
      const t = td as TaskTypeData | null;
      const meta: string[] = [];
      if (t?.task_status) meta.push(t.task_status);
      if (t?.priority && t.priority !== 'Normal') meta.push(`${t.priority} priority`);
      if (t?.due_date) meta.push(`due ${t.due_date}`);
      const checkbox = t?.task_status === 'Done' ? '[x]' : '[ ]';
      const suffix = meta.length ? ` (${meta.join(', ')})` : '';
      return `- ${checkbox} ${item.title}${suffix}`;
    }
    case ItemType.Idea: {
      const i = td as IdeaTypeData | null;
      const suffix = i?.maturity ? ` (${i.maturity})` : '';
      return `- ${item.title}${suffix}`;
    }
    case ItemType.Reminder: {
      const r = td as ReminderTypeData | null;
      const suffix = r?.remind_at ? ` (remind: ${r.remind_at})` : '';
      return `- ${item.title}${suffix}`;
    }
    default:
      return `- ${item.title}`;
  }
}

function itemsToMarkdown(heading: string, items: Item[]): string {
  const nonDividers = items.filter(i => i.item_type !== ItemType.Divider);
  const lines: string[] = [`# ${heading}`, ''];

  for (const item of nonDividers) {
    lines.push(formatItem(item));
    if (item.body) {
      const bodyLines = item.body.split('\n');
      for (const bl of bodyLines) {
        lines.push(`  ${bl}`);
      }
    }
  }

  lines.push('');
  return lines.join('\n');
}

export async function exportTag(userId: UserId, tagId: TagId): Promise<{ filename: string; markdown: string }> {
  const tag = await relRepo.findTagById(tagId, userId);
  if (!tag) throw new NotFoundError('Tag', tagId);

  const items = await itemRepo.findByTag(userId, tagId, 10000, 0);
  const markdown = itemsToMarkdown(tag.name, items);
  const filename = `${tag.name.replace(/[^a-z0-9_-]/gi, '_')}.md`;

  return { filename, markdown };
}

export async function exportUntagged(userId: UserId): Promise<{ filename: string; markdown: string }> {
  const items = await itemRepo.findUntagged(userId, 10000, 0);
  const markdown = itemsToMarkdown('Untagged Items', items);
  return { filename: 'untagged.md', markdown };
}
