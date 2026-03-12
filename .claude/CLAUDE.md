# notes-world

Personal productivity dashboard. Consolidates fragmented notes, ideas, tasks, and reminders into a single structured view.

## Current Phase: 1.1 — Scaffolding complete, implementing backend domains

## Architecture
- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS (dark theme) → `src/client/`
- **Backend:** Node 20 + Express 4 + TypeScript → `src/server/`
- **Database:** PostgreSQL 16 — raw SQL via `pg`, no ORM
- **Deployment:** Docker Compose (app + postgres + daily backup)
- **Events:** In-process Node EventEmitter (`src/server/src/events/eventBus.ts`)

## Commands
```bash
# Development
npm run dev                        # starts both client (5173) and server (3001)
npm run dev --workspace=src/server # server only
npm run dev --workspace=src/client # client only

# Database
npm run migrate                    # run pending SQL migrations
./scripts/setup.sh                 # bootstrap clean machine

# Tests
npm test                           # all tests
npm run test --workspace=src/server
npm run test --workspace=src/client

# Production
docker compose up --build
```

## Phase 1 Scope
**In scope:** Items CRUD + promotion/archive, Tags, Dashboard blocks (QuickCapture, RecentItems, TagCloud, ItemsByTag, Notes, ActionableTasks, BlockedTasks, OverdueTasks as placeholders)
**Out of scope:** Dependencies, Import, CompleteTask/StartTask/BlockTask, multi-user auth

## Key Constants
- `PHASE1_USER_ID = 00000000-0000-0000-0000-000000000001` — single user, hardcoded in Phase 1
- All tables have `user_id` column from day 1 (ADR-005)

## Do Not Touch
- `docs/*.ispec`, `docs/*.intent`, `docs/*.policy`, `docs/*.md` — spec files, source of truth
- `src/server/src/db/migrations/` — only add new files, never edit existing ones

## Sub-phases
- [x] 1.1 Scaffolding
- [ ] 1.2 Items domain backend
- [ ] 1.3 Relationships domain backend (tags)
- [ ] 1.4 Views domain backend
- [ ] 1.5 React frontend
- [ ] 1.6 Contract tests + Docker deploy
