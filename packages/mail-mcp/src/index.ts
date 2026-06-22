import "dotenv/config";
import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { loadConfig } from "./config";
import { registerInboxTools } from "./tools/inbox";
import { registerDraftTools } from "./tools/drafts";
import { createDiscoveryRouter } from "./oauth/discovery";
import { createAuthorizeRouter } from "./oauth/authorize";
import { createTokenRouter } from "./oauth/token";
import { createMcpAuthMiddleware } from "./oauth/middleware";

const config = loadConfig();

function buildServer(): McpServer {
  const server = new McpServer({ name: "mail-mcp", version: "0.1.0" });
  registerInboxTools(server, config);
  registerDraftTools(server, config);
  return server;
}

const app = express();
app.use(express.json());
// OAuth token endpoint requires form-encoded bodies (RFC 6749).
app.use(express.urlencoded({ extended: false }));

app.get("/health", (_req, res) => {
  res.send("ok");
});

// OAuth 2.1 endpoints — public, no auth required.
app.use(createDiscoveryRouter(config.baseUrl));
app.use(createAuthorizeRouter(config.oauthClientId, () => config.apiKey));
app.use(createTokenRouter());

// All routes below require the configured key or a valid JWT Bearer token.
app.use(createMcpAuthMiddleware(config.apiKey));

// Stateless: fresh server + transport per request.
app.all("/mcp", async (req, res) => {
  const server = buildServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
  res.on("finish", () => server.close());
});

app.listen(config.port, () => {
  console.log(`mail-mcp server listening on :${config.port}`);
});
