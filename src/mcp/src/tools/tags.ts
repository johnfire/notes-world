import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { get, post, patch, del } from '../api';

export function registerTagTools(server: McpServer) {
  server.tool(
    'list_tags',
    'List all tags with usage counts.',
    {},
    async () => {
      const tags = await get('/api/tags/usage');
      return { content: [{ type: 'text', text: JSON.stringify(tags, null, 2) }] };
    }
  );

  server.tool(
    'create_tag',
    'Create a new tag.',
    { name: z.string() },
    async ({ name }) => {
      const tag = await post('/api/tags', { name });
      return { content: [{ type: 'text', text: JSON.stringify(tag, null, 2) }] };
    }
  );

  server.tool(
    'tag_item',
    'Add a tag to an item.',
    {
      item_id: z.string().describe('Item UUID'),
      tag_id: z.string().describe('Tag UUID'),
    },
    async ({ item_id, tag_id }) => {
      await post(`/api/tags/item/${item_id}/${tag_id}`);
      return { content: [{ type: 'text', text: `Tagged item ${item_id} with tag ${tag_id}` }] };
    }
  );

  server.tool(
    'untag_item',
    'Remove a tag from an item.',
    {
      item_id: z.string().describe('Item UUID'),
      tag_id: z.string().describe('Tag UUID'),
    },
    async ({ item_id, tag_id }) => {
      await del(`/api/tags/item/${item_id}/${tag_id}`);
      return { content: [{ type: 'text', text: `Removed tag ${tag_id} from item ${item_id}` }] };
    }
  );

  server.tool(
    'get_items_for_tag',
    'Get all items with a specific tag.',
    {
      tag_id: z.string().describe('Tag UUID'),
      limit: z.number().optional().default(50),
    },
    async ({ tag_id, limit }) => {
      const items = await get(`/api/tags/${tag_id}/items?limit=${limit}`);
      return { content: [{ type: 'text', text: JSON.stringify(items, null, 2) }] };
    }
  );

  server.tool(
    'get_tags_for_item',
    'Get all tags attached to an item.',
    { item_id: z.string().describe('Item UUID') },
    async ({ item_id }) => {
      const tags = await get(`/api/tags/item/${item_id}`);
      return { content: [{ type: 'text', text: JSON.stringify(tags, null, 2) }] };
    }
  );

  server.tool(
    'rename_tag',
    'Rename an existing tag.',
    {
      tag_id: z.string().describe('Tag UUID'),
      new_name: z.string(),
    },
    async ({ tag_id, new_name }) => {
      const tag = await patch(`/api/tags/${tag_id}`, { new_name });
      return { content: [{ type: 'text', text: JSON.stringify(tag, null, 2) }] };
    }
  );

  server.tool(
    'delete_tag',
    'Delete a tag entirely.',
    { tag_id: z.string().describe('Tag UUID') },
    async ({ tag_id }) => {
      await del(`/api/tags/${tag_id}`);
      return { content: [{ type: 'text', text: `Deleted tag ${tag_id}` }] };
    }
  );
}
