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

## CI status (for agents)

Both workflows' `notify` job (shared composite action `.github/actions/ci-notify`)
writes its outcome to the VPS — no chat channel needed. To check the last run
without being told, read the JSON:

```bash
ssh claude@82.165.32.162 cat notes-world-ci-status.json       # latest CI/CD (test+deploy)
ssh claude@82.165.32.162 cat notes-world-android-status.json  # latest Android publish
ssh claude@82.165.32.162 tail -n 5 notes-world-ci-history.jsonl  # combined trail (has `workflow` field)
```

`status` is `success` / `failure` / `cancelled`; on failure, drill in with
`gh run view <run_id> --log-failed` (the `run_url`/run id are in the JSON).

A laptop systemd timer (`ci-ping-relay`) also pushes new run results into the
Hermes bridge, so they arrive as `check_messages` pings (sender `ci`) — a real
notification, not just a file.

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
