import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

export function ok(data: unknown): CallToolResult {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

// Each tool catches its own failures and returns them as an error result rather
// than throwing, so one bad call never takes down the stateless server.
export function fail(tool: string, error: unknown): CallToolResult {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[mail-mcp] ${tool} failed:`, message);
  return {
    content: [{ type: "text", text: `Error in ${tool}: ${message}` }],
    isError: true,
  };
}
