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

if (config.allowedRedirectUris.length === 0) {
  console.warn(
    "WARN: MAIL_MCP_ALLOWED_REDIRECT_URIS is not set — any HTTPS redirect_uri will be accepted. Set it to the connector callback URL(s) to lock down the OAuth flow.",
  );
}
if (config.allowedHosts.length === 0) {
  console.warn(
    "WARN: MAIL_MCP_ALLOWED_HOSTS is not set — DNS-rebinding protection is disabled. Set it to the server's public host to enable.",
  );
}

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
app.use(
  createAuthorizeRouter(
    config.oauthClientId,
    () => config.apiKey,
    config.allowedRedirectUris,
  ),
);
app.use(createTokenRouter());

// All routes below require the configured key or a valid JWT Bearer token.
app.use(createMcpAuthMiddleware(config.apiKey));

// Stateless: fresh server + transport per request.
app.all("/mcp", async (req, res) => {
  const server = buildServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableDnsRebindingProtection: config.allowedHosts.length > 0,
    allowedHosts:
      config.allowedHosts.length > 0 ? config.allowedHosts : undefined,
  });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
  res.on("finish", () => server.close());
});

app.listen(config.port, () => {
  console.log(`mail-mcp server listening on :${config.port}`);
});
