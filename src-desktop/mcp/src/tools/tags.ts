import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { get, post, patch, del } from '../api';

export function registerTagTools(server: McpServer) {
  server.tool(
    'list_tags',
    'List tags with usage counts. Optionally filter by the colour the user assigned to a tag (an exact hex such as "#84cc16") to pull a whole colour-coded group at once — the user colour-codes tags by theme (e.g. green = health/food, purple = art).',
    { color: z.string().optional().describe('Hex colour to filter by, e.g. "#84cc16". Omit to list every tag.') },
    async ({ color }) => {
      const qs = color ? `?color=${encodeURIComponent(color)}` : '';
      const tags = await get(`/api/tags/usage${qs}`);
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
      offset: z.number().optional().default(0).describe('Number of items to skip for pagination'),
    },
    async ({ tag_id, limit, offset }) => {
      const items = await get(`/api/tags/${tag_id}/items?limit=${limit}&offset=${offset}`) as any[];
      let text = JSON.stringify(items, null, 2);
      if (items.length === limit) {
        text += `\n\n--- Showing ${offset + items.length} items. Load more?`;
      }
      return { content: [{ type: 'text', text }] };
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
