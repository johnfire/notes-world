import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { get, post, patch, del } from '../api';

export function registerItemTools(server: McpServer) {
  const isoDate = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'must be a date in YYYY-MM-DD format');

  server.tool(
    'create_item',
    'Create a new item (note, idea, task, or untyped). Optionally set a due date and/or start date (YYYY-MM-DD). Returns the created item.',
    {
      title: z.string(),
      body: z.string().optional(),
      due_date: isoDate.optional().describe('Optional due date, YYYY-MM-DD'),
      start_date: isoDate.optional().describe('Optional start date, YYYY-MM-DD'),
    },
    async ({ title, body, due_date, start_date }) => {
      const item = await post<{
        id: string;
        type_data?: Record<string, unknown> | null;
      }>('/api/items', { title, body });

      // Dates live in the item's type_data JSON. A freshly captured item has
      // none, so we patch them in (no existing keys to preserve).
      if (due_date || start_date) {
        const type_data: Record<string, unknown> = { ...(item.type_data ?? {}) };
        if (due_date) type_data.due_date = due_date;
        if (start_date) type_data.start_date = start_date;
        const updated = await patch(`/api/items/${item.id}`, { type_data });
        return { content: [{ type: 'text', text: JSON.stringify(updated, null, 2) }] };
      }

      return { content: [{ type: 'text', text: JSON.stringify(item, null, 2) }] };
    }
  );

  server.tool(
    'get_item',
    'Get a single item by its ID.',
    { id: z.string().describe('Item UUID') },
    async ({ id }) => {
      const item = await get(`/api/items/${id}`);
      return { content: [{ type: 'text', text: JSON.stringify(item, null, 2) }] };
    }
  );

  server.tool(
    'update_item',
    'Update an item\'s title, body, color, and/or its due/start dates (YYYY-MM-DD).',
    {
      id: z.string().describe('Item UUID'),
      title: z.string().optional(),
      body: z.string().optional(),
      color: z.string().nullable().optional(),
      due_date: isoDate.optional().describe('Set the due date, YYYY-MM-DD'),
      start_date: isoDate.optional().describe('Set the start date, YYYY-MM-DD'),
    },
    async ({ id, due_date, start_date, ...updates }) => {
      const body: Record<string, unknown> = { ...updates };
      // The update endpoint replaces type_data wholesale, so merge the dates
      // into the item's existing type_data to preserve task_status/priority/etc.
      if (due_date || start_date) {
        const current = await get<{
          type_data?: Record<string, unknown> | null;
        }>(`/api/items/${id}`);
        const type_data: Record<string, unknown> = { ...(current.type_data ?? {}) };
        if (due_date) type_data.due_date = due_date;
        if (start_date) type_data.start_date = start_date;
        body.type_data = type_data;
      }
      const item = await patch(`/api/items/${id}`, body);
      return { content: [{ type: 'text', text: JSON.stringify(item, null, 2) }] };
    }
  );

  server.tool(
    'promote_item',
    'Promote an untyped item to a specific type (Task, Idea, Note, Reminder).',
    {
      id: z.string().describe('Item UUID'),
      new_type: z.enum(['Task', 'Idea', 'Note', 'Reminder']),
      type_data: z.string().optional().describe('JSON string of type-specific data, e.g. \'{"task_status":"Open","priority":"Normal"}\''),
    },
    async ({ id, new_type, type_data }) => {
      const item = await post(`/api/items/${id}/promote`, { new_type, type_data: type_data ? JSON.parse(type_data) : undefined });
      return { content: [{ type: 'text', text: JSON.stringify(item, null, 2) }] };
    }
  );

  server.tool(
    'archive_item',
    'Archive an item (soft delete, moves to trash).',
    { id: z.string().describe('Item UUID') },
    async ({ id }) => {
      const item = await post(`/api/items/${id}/archive`);
      return { content: [{ type: 'text', text: JSON.stringify(item, null, 2) }] };
    }
  );

  server.tool(
    'restore_item',
    'Restore an archived item back to active status.',
    { id: z.string().describe('Item UUID') },
    async ({ id }) => {
      const item = await post(`/api/items/${id}/restore`);
      return { content: [{ type: 'text', text: JSON.stringify(item, null, 2) }] };
    }
  );

  server.tool(
    'get_recent_items',
    'Get the most recently updated items.',
    { limit: z.number().optional().default(20).describe('Max items to return (default 20)') },
    async ({ limit }) => {
      const items = await get(`/api/items/recent?limit=${limit}`);
      return { content: [{ type: 'text', text: JSON.stringify(items, null, 2) }] };
    }
  );

  server.tool(
    'get_trash',
    'List archived/trashed items.',
    { limit: z.number().optional().default(50) },
    async ({ limit }) => {
      const items = await get(`/api/items/trash?limit=${limit}`);
      return { content: [{ type: 'text', text: JSON.stringify(items, null, 2) }] };
    }
  );
}
