import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { get } from '../api';

export function registerExportTools(server: McpServer) {
  server.tool(
    'export_tag',
    'Export all items for a tag as markdown.',
    { tag_id: z.string().describe('Tag UUID') },
    async ({ tag_id }) => {
      const markdown = await get<string>(`/api/export/tag/${tag_id}`);
      return { content: [{ type: 'text', text: typeof markdown === 'string' ? markdown : JSON.stringify(markdown) }] };
    }
  );

  server.tool(
    'export_untagged',
    'Export all untagged items as markdown.',
    {},
    async () => {
      const markdown = await get<string>('/api/export/untagged');
      return { content: [{ type: 'text', text: typeof markdown === 'string' ? markdown : JSON.stringify(markdown) }] };
    }
  );
}
