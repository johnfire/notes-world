import "dotenv/config";
import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { registerItemTools } from "./tools/items";
import { registerTagTools } from "./tools/tags";
import { registerTaskTools } from "./tools/tasks";
import { registerSearchTools } from "./tools/search";
import { registerExportTools } from "./tools/export";
import { registerChecklistTools } from "./tools/checklists";
import { createDiscoveryRouter } from "./oauth/discovery";
import { createAuthorizeRouter } from "./oauth/authorize";
import { createTokenRouter } from "./oauth/token";
import { createMcpAuthMiddleware } from "./oauth/middleware";

function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`${name} environment variable is not set`);
  return val;
}

// HS256 token security rests entirely on the secret's strength.
const JWT_SECRET_MIN_LENGTH = 32;
function requireSecret(name: string, minLength: number): string {
  const val = requireEnv(name);
  if (val.length < minLength) {
    throw new Error(
      `${name} must be at least ${minLength} characters (got ${val.length})`,
    );
  }
  return val;
}

function parseList(name: string): string[] {
  return (process.env[name] ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

const PORT = parseInt(process.env.MCP_PORT ?? "3002", 10);
const MCP_BASE_URL = requireEnv("MCP_BASE_URL");
const MCP_OAUTH_CLIENT_ID = requireEnv("MCP_OAUTH_CLIENT_ID");
// Validate remaining required vars at startup
requireSecret("MCP_JWT_SECRET", JWT_SECRET_MIN_LENGTH);
requireEnv("NOTES_WORLD_API_KEY");

// Exact-match allowlist for OAuth redirect_uri (the connector's callback). When
// empty the authorize endpoint falls back to https-only — warn so it gets set.
const MCP_ALLOWED_REDIRECT_URIS = parseList("MCP_ALLOWED_REDIRECT_URIS");
if (MCP_ALLOWED_REDIRECT_URIS.length === 0) {
  console.warn(
    "WARN: MCP_ALLOWED_REDIRECT_URIS is not set — any HTTPS redirect_uri will be accepted. Set it to the connector callback URL(s) to lock down the OAuth flow.",
  );
}

// Hosts allowed in the Host header — enables DNS-rebinding protection on the
// HTTP transport when set. Left off (with a warning) if unconfigured so a
// proxy that rewrites Host doesn't break the server.
const MCP_ALLOWED_HOSTS = parseList("MCP_ALLOWED_HOSTS");
if (MCP_ALLOWED_HOSTS.length === 0) {
  console.warn(
    "WARN: MCP_ALLOWED_HOSTS is not set — DNS-rebinding protection is disabled. Set it to the server's public host to enable.",
  );
}

function buildServer(): McpServer {
  const server = new McpServer({ name: "notes-world", version: "0.1.0" });
  registerItemTools(server);
  registerTagTools(server);
  registerTaskTools(server);
  registerSearchTools(server);
  registerExportTools(server);
  registerChecklistTools(server);
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
    MCP_ALLOWED_REDIRECT_URIS,
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
    enableDnsRebindingProtection: MCP_ALLOWED_HOSTS.length > 0,
    allowedHosts: MCP_ALLOWED_HOSTS.length > 0 ? MCP_ALLOWED_HOSTS : undefined,
  });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
  res.on("finish", () => server.close());
});

app.listen(PORT, () => {
  console.log(`MCP server listening on :${PORT}`);
});
