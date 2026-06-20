# notes-world

Personal productivity web app. Consolidates notes, ideas, tasks, and reminders. Live at https://notes-world.christopherrehm.de. In daily use.

## Current State

Phase 1 complete and deployed. Multi-user JWT auth, admin panel, mobile app (Expo), MCP server for AI access, full item/tag/dashboard system.

## Monorepo Structure

```
packages/
  server/    Express API (TypeScript, Node 20) — port 3001
  web/       React 18 SPA (Vite, Tailwind) — port 5173 in dev
  shared/    Shared types
  mcp/       MCP server (Streamable HTTP :3002, OAuth 2.1) for AI agent access
  mobile/    React Native app (Expo SDK 54)
  importer/  Python markdown importer
```

## Commands

```bash
# Development
npm run dev                           # client + server
npm run dev --workspace=packages/web  # web only
npm run dev --workspace=packages/server # server only

# Build
npm run build --workspace=packages/web

# Tests
npm test

# Production
docker compose up --build
```

## Key Constants

- `PHASE1_USER_ID = 00000000-0000-0000-0000-000000000001` — hardcoded single-user constant, still used in non-auth contexts
- All tables have `user_id` column (ADR-005)
- Migrations: `packages/server/src/db/migrations/` — only add new files, never edit existing

## Doc Index

Read only the doc relevant to the current task.

| File                   | Domain       | Read when...                                                    |
| ---------------------- | ------------ | --------------------------------------------------------------- |
| `docs/architecture.md` | Architecture | canonical current-state architecture — all surfaces, data model, CI/CD, ADRs, risks (update in place; PDF at `architecture.pdf`) |
| `docs/deployment.md`   | Deployment   | deploying, SSH access, Docker, VPS setup                        |
| `docs/database.md`     | Database     | schema, migrations, limits, backup, archive policy             |
| `docs/features.md`     | Features     | what's built, what's planned, phase status                     |
| `docs/vision.md`       | Vision       | long-term direction, AI-as-interface, architectural decisions  |
| `docs/api.md`          | API          | endpoints, auth, rate limiting, MCP server, error format       |
| `docs/older-docs/`     | Archive      | superseded docs — old ispecs, archived feature notes, superpowers plans/specs; reference only |
