import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { get } from '../api';

export function registerSearchTools(server: McpServer) {
  server.tool(
    'search_items',
    'Full-text search across all items by title and body.',
    {
      query: z.string().describe('Search text'),
      limit: z.number().optional().default(50),
    },
    async ({ query, limit }) => {
      const items = await get(`/api/items/search?q=${encodeURIComponent(query)}&limit=${limit}`);
      return { content: [{ type: 'text', text: JSON.stringify(items, null, 2) }] };
    }
  );
}
