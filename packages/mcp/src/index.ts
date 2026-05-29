import "dotenv/config";
import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { registerItemTools } from "./tools/items";
import { registerTagTools } from "./tools/tags";
import { registerTaskTools } from "./tools/tasks";
import { registerSearchTools } from "./tools/search";
import { registerExportTools } from "./tools/export";
import { requestKeyStore } from "./api";

const MCP_API_KEY = process.env.MCP_API_KEY;
const PORT = parseInt(process.env.MCP_PORT ?? "3002", 10);

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

app.get("/health", (_req, res) => {
  res.send("ok");
});

// Auth: nw_ user keys are threaded to backend calls; MCP_API_KEY is the service-level fallback
app.use((req, res, next) => {
  const raw =
    (req.headers["x-api-key"] as string | undefined) ??
    req.headers.authorization?.replace(/^Bearer\s+/i, "") ??
    (req.query["key"] as string | undefined);

  if (!raw) {
    res.status(401).json({ error: "API key required" });
    return;
  }

  if (raw.startsWith("nw_")) {
    requestKeyStore.run(raw, next);
    return;
  }

  if (MCP_API_KEY && raw === MCP_API_KEY) {
    next();
    return;
  }

  res.status(401).json({ error: "Invalid API key" });
});

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
