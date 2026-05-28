# Architecture

**Last Updated:** 2026-05-26
**Status:** current
**Read when:** starting any dev task, understanding how the system fits together

## Summary

notes-world is a personal productivity web app and API. It runs as a Docker stack on a VPS. The monorepo contains a React SPA, an Express API, a PostgreSQL database, a mobile app, an MCP server for AI agent access, and a Python importer.

## Monorepo Structure

```
packages/
  server/     Express API (TypeScript, Node 20)
  web/        React 18 SPA (Vite, Tailwind, TypeScript)
  shared/     Shared types between server and web
  mcp/        MCP server for AI agent access (stdio)
  mobile/     React Native app (Expo SDK 54)
  importer/   Python markdown importer

src-desktop/  Old single-package structure — reference only, do not touch
```

## Tech Stack

| Layer      | Tech                                                |
| ---------- | --------------------------------------------------- |
| Frontend   | React 18, TypeScript, Vite, Tailwind CSS            |
| Backend    | Node 20, Express 4, TypeScript                      |
| Database   | PostgreSQL 16, raw SQL via `pg`, no ORM             |
| Mobile     | React Native, Expo SDK 54, Expo Router              |
| AI access  | MCP server (stdio), calls REST API over HTTP        |
| Deployment | Docker Compose (app + nginx + postgres + db-backup) |
| SSL proxy  | Apache on host → nginx container → Express          |

## Backend Domain Architecture

Six domains, each with its own controller/service/repository:

- **Items** — core entity CRUD, type promotion, archive, search
- **Relationships** — tags, tag assignment, dependency graph, cross-references
- **Views** — dashboard configuration, block layout, block types
- **Import** — markdown parsing, batch item creation, duplicate detection
- **SortOrders** — drag-and-drop ordering per context, persisted per user
- **Export** — markdown export by tag, untagged, or all

Domains communicate through an in-process Node EventEmitter (`eventBus.ts`). Direct cross-domain imports are not allowed — go through events or the service layer.

## Key Decisions

- **user_id on every table** — Phase 1 uses a hardcoded constant; adding real auth is one migration, not a rewrite (ADR-005)
- **REST not GraphQL** — data access patterns are predictable; REST is simpler (ADR-009)
- **MCP calls REST** — MCP server stays decoupled from internals; works regardless of how the app is run (ADR-011)
- **JSONB for type-variant fields** — items can be promoted to Task/Idea/Note/Reminder, adding fields without losing base data (ADR-007)
- **HTML5 drag-and-drop** — no library dependency; a shared `useSortableList` hook handles all sortable lists (ADR-010)

## Data Flow

```
Browser / Mobile App
    → HTTPS → Apache (SSL termination)
    → HTTP → nginx container
    → HTTP → Express API (port 3001)
    → pg driver → PostgreSQL

AI Agent (Claude Code, Claude Desktop)
    → stdio → MCP server (packages/mcp)
    → HTTP → Express API
    → pg driver → PostgreSQL
```
