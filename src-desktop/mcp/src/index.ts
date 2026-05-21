import 'dotenv/config';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { registerItemTools } from './tools/items';
import { registerTagTools } from './tools/tags';
import { registerTaskTools } from './tools/tasks';
import { registerSearchTools } from './tools/search';
import { registerExportTools } from './tools/export';

const server = new McpServer({
  name: 'notes-world',
  version: '0.1.0',
});

registerItemTools(server);
registerTagTools(server);
registerTaskTools(server);
registerSearchTools(server);
registerExportTools(server);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('MCP server failed to start:', err);
  process.exit(1);
});
