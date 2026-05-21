import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { get, post, patch, del } from '../api';

export function registerItemTools(server: McpServer) {
  server.tool(
    'create_item',
    'Create a new item (note, idea, task, or untyped). Returns the created item.',
    { title: z.string(), body: z.string().optional() },
    async ({ title, body }) => {
      const item = await post('/api/items', { title, body });
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
    'Update an item\'s title, body, type_data, or color.',
    {
      id: z.string().describe('Item UUID'),
      title: z.string().optional(),
      body: z.string().optional(),
      color: z.string().nullable().optional(),
    },
    async ({ id, ...updates }) => {
      const item = await patch(`/api/items/${id}`, updates);
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
