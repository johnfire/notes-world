import "dotenv/config";
import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { registerItemTools } from "./tools/items";
import { registerTagTools } from "./tools/tags";
import { registerTaskTools } from "./tools/tasks";
import { registerSearchTools } from "./tools/search";
import { registerExportTools } from "./tools/export";
import { createDiscoveryRouter } from "./oauth/discovery";
import { createAuthorizeRouter } from "./oauth/authorize";
import { createTokenRouter } from "./oauth/token";
import { createMcpAuthMiddleware } from "./oauth/middleware";

function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`${name} environment variable is not set`);
  return val;
}

const PORT = parseInt(process.env.MCP_PORT ?? "3002", 10);
const MCP_BASE_URL = requireEnv("MCP_BASE_URL");
const MCP_OAUTH_CLIENT_ID = requireEnv("MCP_OAUTH_CLIENT_ID");
// Validate remaining required vars at startup
requireEnv("MCP_JWT_SECRET");
requireEnv("NOTES_WORLD_API_KEY");

function buildServer(): McpServer {
  const server = new McpServer({ name: "notes-world", version: "0.1.0" });
  registerItemTools(server);
  registerTagTools(server);
  registerTaskTools(server);
  registerSearchTools(server);
  registerExportTools(server);
  return server;
}

const app = express();
app.use(express.json());
// OAuth token endpoint requires form-encoded bodies (RFC 6749)
app.use(express.urlencoded({ extended: false }));

app.get("/health", (_req, res) => {
  res.send("ok");
});

// OAuth 2.1 endpoints — public, no auth required
app.use(createDiscoveryRouter(MCP_BASE_URL));
app.use(
  createAuthorizeRouter(
    MCP_OAUTH_CLIENT_ID,
    () => process.env.NOTES_WORLD_API_KEY!,
  ),
);
app.use(createTokenRouter());

// All routes below require a valid nw_ key or JWT Bearer token
app.use(createMcpAuthMiddleware());

// Stateless: fresh server + transport per request
app.all("/mcp", async (req, res) => {
  const server = buildServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
  res.on("finish", () => server.close());
});

app.listen(PORT, () => {
  console.log(`MCP server listening on :${PORT}`);
});
