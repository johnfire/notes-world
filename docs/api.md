# API

**Last Updated:** 2026-05-26
**Status:** current
**Read when:** adding endpoints, debugging API calls, working on MCP server, auth issues

## Summary

Express REST API on port 3001. JWT auth for all `/api` routes except `/health` and `/api/auth`. Rate limited to 200 req/min per IP. MCP server in `packages/mcp` (Streamable HTTP on port 3002, OAuth 2.1) exposes 25+ tools by calling this API.

## Base URL

- **Production:** https://notes-world.christopherrehm.de/api
- **Local dev:** http://localhost:3001/api

## Auth

- JWT tokens issued at login, stored in `Authorization: Bearer <token>` header
- Mobile app stores token in Expo SecureStore
- MCP server: OAuth 2.1 for interactive connectors, or a `nw_` API key (SHA-256 hashed, revocable)
- Admin endpoints require role `admin`

## Rate Limiting

- 200 requests/minute per IP on all `/api` routes
- `/health` exempt
- Disabled in test environment
- Headers: `RateLimit-*` (draft-7 standard)
- Express must have `trust proxy = 1` set (Apache sets X-Forwarded-For)

## Endpoint Groups

### Auth — `/api/auth`

- `POST /login` — returns JWT
- `POST /register` — create account (if open registration enabled)
- `POST /logout`

### Items — `/api/items`

- `GET /` — paginated list (default 50, max 200)
- `POST /` — create item
- `GET /:id` — get item
- `PATCH /:id` — update item
- `POST /:id/promote` — promote to typed item (task/idea/note/reminder)
- `POST /:id/archive` — archive
- `POST /:id/restore` — restore from archive
- `GET /search?q=` — full-text search

### Tags — `/api/tags`

- `GET /` — all tags with item counts
- `POST /` — create tag
- `PATCH /:id` — rename tag
- `DELETE /:id` — delete tag
- `GET /:id/items` — items for a tag
- `POST /:itemId/tags/:tagId` — assign tag to item
- `DELETE /:itemId/tags/:tagId` — remove tag from item

### Views — `/api/views`

- `GET /dashboard` — get dashboard config
- `POST /dashboard/blocks` — add block
- `DELETE /dashboard/blocks/:id` — remove block
- `PATCH /dashboard/blocks/:id` — update block
- `POST /dashboard/blocks/reorder` — reorder blocks

### Sort Orders — `/api/sort-orders`

- `GET /:context` — get saved order for a context key
- `PUT /:context` — save order for a context key

### Export — `/api/export`

- `GET /tag/:tagId` — export one tag's items as a single `.md` file
- `GET /untagged` — export untagged items as a single `.md` file
- `GET /all` — export the whole database as a `.zip` (one `.md` per tag + `untagged.md`)

Markdown output preserves type metadata, dividers, and colors (colors as `<!-- color: #hex -->` HTML comments) so exports are re-importable. Full export uses `archiver` (zlib level 9).

### Admin — `/api/admin`

- `GET /users` — list all users (admin only)
- `POST /users` — create user account (admin only)
- `PATCH /users/:id` — update user (admin only)

### System

- `GET /health` — `{ status, version, uptime, timestamp }` — no auth required
- `GET /mobile/version` — current APK version info

## MCP Server

Location: `packages/mcp/` — runs as the `mcp` service in the Docker stack.

- Transport: Streamable HTTP (stateless — a fresh `McpServer` per request) on port 3002, exposed at `/mcp` via nginx
- Connector URL: `https://notes-world.christopherrehm.de/mcp`
- Auth: OAuth 2.1 (`/.well-known/oauth-authorization-server`, `/oauth/authorize`, `/oauth/token`) for interactive connectors (e.g. the claude.ai connector); tool calls authenticate via JWT or a `nw_` API key
- Data path: calls the REST API with `NOTES_WORLD_API_KEY` — never the database directly
- 25+ tools: full CRUD on items, tags, tasks, notes/ideas + search + export + checklists

## Error Format

```json
{ "error": { "code": "NOT_FOUND", "message": "Item not found" } }
```

Error hierarchy: `SystemError` (DatabaseError, NetworkError, TimeoutError) | `ClientError` (ValidationError, AuthorizationError, NotFoundError, ConflictError) | `BusinessError` (PolicyViolation, LimitExceeded, StateError, CircularDependencyError)
