import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { get, post } from '../api';

export function registerTaskTools(server: McpServer) {
  server.tool(
    'list_tasks',
    'List all tasks, optionally filtered. Returns tasks with their status and priority.',
    { limit: z.number().optional().default(200) },
    async ({ limit }) => {
      const tasks = await get(`/api/items/type/Task?limit=${limit}`);
      return { content: [{ type: 'text', text: JSON.stringify(tasks, null, 2) }] };
    }
  );

  server.tool(
    'start_task',
    'Move a task to "In Progress" status.',
    { id: z.string().describe('Task item UUID') },
    async ({ id }) => {
      const item = await post(`/api/items/${id}/start`);
      return { content: [{ type: 'text', text: JSON.stringify(item, null, 2) }] };
    }
  );

  server.tool(
    'complete_task',
    'Mark a task as done.',
    { id: z.string().describe('Task item UUID') },
    async ({ id }) => {
      const item = await post(`/api/items/${id}/complete`);
      return { content: [{ type: 'text', text: JSON.stringify(item, null, 2) }] };
    }
  );

  server.tool(
    'block_task',
    'Mark a task as blocked.',
    { id: z.string().describe('Task item UUID') },
    async ({ id }) => {
      const item = await post(`/api/items/${id}/block`);
      return { content: [{ type: 'text', text: JSON.stringify(item, null, 2) }] };
    }
  );

  server.tool(
    'list_ideas',
    'List all ideas with their maturity level (Seed, Developing, Ready, Parked).',
    { limit: z.number().optional().default(200) },
    async ({ limit }) => {
      const ideas = await get(`/api/items/type/Idea?limit=${limit}`);
      return { content: [{ type: 'text', text: JSON.stringify(ideas, null, 2) }] };
    }
  );

  server.tool(
    'list_notes',
    'List all notes.',
    { limit: z.number().optional().default(200) },
    async ({ limit }) => {
      const notes = await get(`/api/items/type/Note?limit=${limit}`);
      return { content: [{ type: 'text', text: JSON.stringify(notes, null, 2) }] };
    }
  );
}
