# Architecture — Personal Productivity Dashboard

## System Overview

A web-based personal productivity dashboard that consolidates fragmented
notes, ideas, tasks, and reminders into a single structured view with
dependencies, priorities, and tags.

```
┌─────────────────────────────────────────────────┐
│                   Browser (React)                │
│  ┌──────────┐ ┌──────────────────────────────┐  │
│  │ Sidebar  │ │     Main Dashboard Grid      │  │
│  │ (tags,   │ │  ┌────────┐ ┌────────┐       │  │
│  │ filters, │ │  │ Block  │ │ Block  │ ...   │  │
│  │ search)  │ │  └────────┘ └────────┘       │  │
│  └──────────┘ └──────────────────────────────┘  │
└───────────────────────┬─────────────────────────┘
                        │ REST API (JSON)
┌───────────────────────┴─────────────────────────┐
│              Node / Express Backend              │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
│  │  Items   │ │Relations │ │      Views       │ │
│  │  Domain  │ │  Domain  │ │      Domain      │ │
│  └────┬─────┘ └────┬─────┘ └────────┬─────────┘ │
│       │            │                │            │
│  ┌────┴────────────┴────────────────┴──────────┐ │
│  │            PostgreSQL (single instance)      │ │
│  └─────────────────────────────────────────────┘ │
└───────────────────────┬─────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
  ┌─────┴─────┐  ┌──────┴──────┐  ┌────┴────┐
  │ MCP Server│  │  pg_dump    │  │  Health  │
  │ (stdio)   │  │  (daily)    │  │ /health  │
  │ AI agents │  │  7d/4w/3m   │  │ version  │
  └───────────┘  └─────────────┘  │ uptime   │
                                  └──────────┘
```

## Architecture Decisions

### ADR-001: Web Application Over Desktop Application

**Date:** 2026-03-12
**Status:** Accepted
**Context:** User needs access from Ubuntu laptop, Linux Mint desktop,
Android phone, and Android tablet.
**Decision:** Build as a web application served over HTTP.
**Reason:** A web app is the only approach that works across all four
device types without maintaining separate codebases. Responsive CSS
handles the phone/tablet form factors.
**Rejected:** Electron (doesn't work on Android), native apps
(four codebases), terminal UI (not usable on phone/tablet).
**Consequences:** Requires a running server. Requires network
connectivity to the server. UI constrained to browser capabilities.

### ADR-002: React Frontend

**Date:** 2026-03-12
**Status:** Accepted
**Context:** Need a component-based UI framework for a dashboard
with configurable blocks, sidebars, and interactive elements.
**Decision:** React with functional components and hooks.
**Reason:** User has 6 years of React experience. Component model
maps directly to dashboard blocks. Ecosystem is mature for dashboard
UI patterns (drag-and-drop, grid layouts, responsive design).
**Rejected:** Vue (viable, but React is more practiced for this user).
**Consequences:** JSX/TSX build pipeline required. State management
decisions needed (likely React Context + useReducer for Phase 1,
with option to add Redux or Zustand if complexity grows).

### ADR-003: Node/Express Backend

**Date:** 2026-03-12
**Status:** Accepted
**Context:** Need an API server for Phase 1. Must be fast to develop.
Must be replaceable with a more robust backend in later phases.
**Decision:** Node.js with Express for Phase 1.
**Reason:** Minimal overhead for a single-user application. Same
language as frontend reduces context switching. Fast iteration.
The API contract is defined by the .ispec, so the backend can be
rewritten in Kotlin/Spring Boot for multi-tenant phases without
touching the frontend.
**Rejected:** Kotlin/Spring Boot (correct choice for multi-tenant,
overkill for single-user Phase 1). Python/Django (user prefers
Node for this type of application).
**Consequences:** Less type safety than Kotlin. No built-in
dependency injection. Acceptable for Phase 1 scope.

### ADR-004: PostgreSQL Database

**Date:** 2026-03-12
**Status:** Accepted
**Context:** Data model has relationships as first-class concepts.
Dependencies form a directed acyclic graph. Items reference tags
and other items. Need flexible fields for item type variants.
**Decision:** PostgreSQL with JSONB for type-variant fields.
**Reason:** Foreign keys enforce referential integrity for dependencies.
Recursive CTEs enable efficient dependency chain traversal. JSONB
columns handle the flexible type-specific fields (task fields, idea
fields) without losing relational structure on core fields. Free,
mature, well-supported.
**Rejected:** MongoDB (would require application-level joins for
dependency graph traversal, manual consistency management for
relationships — the data is fundamentally relational).
**Consequences:** Schema migrations needed when entity definitions
change. Mitigated by the .ispec workflow — schema changes go through
the spec first, compiler regenerates.

### ADR-005: Single-User Phase 1 with Multi-Tenant Architecture Readiness

**Date:** 2026-03-12
**Status:** Accepted
**Context:** Phase 1 is for one user. Future phases may be commercial
multi-tenant.
**Decision:** Build Phase 1 without authentication or user isolation,
but structure the data model so that adding a user_id foreign key
to all tables is a single migration, not a rewrite.
**Reason:** Building full multi-tenant infrastructure before validating
the product wastes months. But painting yourself into a corner where
multi-tenant requires a rewrite is worse.
**Implementation:** Every table has a user_id column from day one,
set to a constant value in Phase 1. All queries include a user_id
filter. When auth is added, the filter becomes dynamic. No structural
changes needed.
**Consequences:** Slight overhead in Phase 1 (unused user_id column).
Trivial cost for significant future flexibility.

### ADR-006: Docker Deployment on Home Network

**Date:** 2026-03-12
**Status:** Accepted
**Context:** Phase 1 is single-user on a home network with a desktop
(pierre, Linux Mint) and laptop (crehm-asus, Ubuntu).
**Decision:** Docker Compose with app container + PostgreSQL container +
daily backup container, deployed on the home network.
**Reason:** Docker provides consistent environment across both machines.
Docker Compose manages the app + database as a unit. Accessible from
all devices on the home network via IP:port.
**Deployment target:** Either pierre (desktop, always on) or crehm-asus
(laptop, primary machine). User to decide based on uptime preference.
**Consequences:** No access outside home network without additional
setup (Tailscale, VPN, or port forwarding). Acceptable for Phase 1.

### ADR-007: Item-Centric Domain Model (Option C — Items Evolve)

**Date:** 2026-03-12
**Status:** Accepted
**Context:** User's existing content has no differentiation between
notes, ideas, tasks, and reminders. Need to support fast capture
without forced classification, but also structured behavior for
promoted items.
**Decision:** Everything starts as an Item with core fields (text,
tags, created_at). Items can be promoted to typed variants (Task,
Idea, Note, Reminder) which add type-specific fields. Promotion
is additive — the base item data is never lost.
**Reason:** Matches the user's actual workflow — capture fast,
organize later. No friction at creation time. Full structure
available when the user is ready to organize.
**Consequences:** The Item entity has a type discriminator field
and a JSONB column for type-specific data. Queries must handle
both untyped and typed items. UI must make promotion easy and
non-destructive.

### ADR-008: Six-Domain Architecture

**Date:** 2026-03-12 (updated 2026-03-17)
**Status:** Accepted
**Context:** System needs clear separation of concerns for
maintainability and anti-fragility.
**Decision:** Six domains — Items, Relationships, Views, Import, SortOrders, Export.
**Reason:**
- Items: core entity management — CRUD, type promotion, search
- Relationships: dependency graph, tag management, cross-references
- Views: dashboard configuration, block layout, priority computation
- Import: markdown parsing, batch item creation, duplicate detection
- SortOrders: user-defined drag-and-drop ordering for any list view
- Export: markdown export by tag, untagged, or all items
**Consequences:** Domains communicate through events. Items domain
emitting ItemCreated, ItemPromoted, ItemArchived. Relationships
domain listening for those to update the dependency graph. Views
domain consuming both for dashboard state. Import domain creating
items through the Items domain API, not directly. SortOrders domain
is stateless with respect to events — it is read and written directly
by the UI on drag completion.

### ADR-009: REST API Over GraphQL

**Date:** 2026-03-12
**Status:** Accepted
**Context:** Need an API between React frontend and Express backend.
**Decision:** REST with JSON payloads.
**Reason:** The data access patterns are predictable — dashboard
blocks request specific views, items are CRUD with filters. GraphQL's
flexibility is unnecessary for Phase 1 and adds query complexity.
REST is simpler to implement, debug, and document.
**Rejected:** GraphQL (adds complexity without clear benefit at this
scale), WebSockets (not needed for Phase 1 — no real-time collaboration).
**Consequences:** May need to add WebSocket support for real-time
updates in multi-user phases. Acceptable — the API contract defined
by .ispec supports either transport.

### ADR-010: Drag-and-Drop Ordering via HTML5 Drag API

**Date:** 2026-03-15
**Status:** Accepted
**Context:** Several list views (items by tag, ideas by maturity, sidebar
tag list) need user-controllable ordering that persists across sessions.
**Decision:** HTML5 native drag-and-drop API with per-context sort order
persistence via the SortOrders domain. A shared `useSortableList` React
hook encapsulates the drag state, drop handling, and server sync.
**Reason:** No additional library dependencies. The native API is
sufficient for the single-list reorder use case. A shared hook ensures
consistent behavior across all sortable lists.
**Key implementation constraints:**
- The hook effect that loads saved order must key on a stable identifier
  (sorted item IDs joined as a string) rather than the array reference,
  to prevent re-renders from resetting local drag state.
- A `isDragging` ref guards the effect from firing while a drag is
  in progress, preventing the drop result from being overwritten by
  a concurrent server fetch.
- The drag source must be the same DOM element as the drop zone to
  avoid events landing on elements with no handlers. A `mousedown`
  flag on the grip handle gates whether `dragstart` is allowed on
  the row element, preserving handle-only drag initiation.
**Rejected:** `@dnd-kit`, `react-beautiful-dnd` (unnecessary dependency
for this use case). Block-swap reorder for dashboard blocks uses
`ReorderBlocks` operation instead (different interaction model).
**Consequences:** Two drag systems coexist on the sidebar — item-to-tag
drops and tag reorder drags. These are disambiguated by MIME type:
item drags set `application/x-item-id`; tag reorder drags use only
`text/plain`. Event handlers check `dataTransfer.types` to route correctly.

### ADR-011: MCP Server for AI Agent Access

**Date:** 2026-03-17
**Status:** Accepted
**Context:** AI agents (Claude Code, Claude Desktop, Cursor) need
structured access to notes-world data without scraping the UI or
crafting raw HTTP requests.
**Decision:** A separate MCP (Model Context Protocol) server in
`src/mcp/` that exposes tools over stdio transport. The MCP server
calls the REST API over HTTP — it does not import the service layer
directly.
**Reason:** MCP is the standard protocol for AI tool integration.
Using HTTP as the bridge keeps the MCP server decoupled from the
backend internals — it works whether the app runs via `npm run dev`
or Docker. Stdio transport is the simplest for local use.
**Consequences:** The REST API must be running for the MCP server to
function. The MCP server is not included in the Docker image — it
runs as a local process configured in the AI client.

### ADR-012: Automated Database Backups

**Date:** 2026-03-17
**Status:** Accepted
**Context:** Single-user system with no redundancy. Data loss from
disk failure, accidental deletion, or bad migration is unrecoverable
without backups.
**Decision:** Docker Compose `db-backup` service using
`prodrigestivill/postgres-backup-local`. Daily compressed pg_dump
with 7 daily, 4 weekly, 3 monthly retention.
**Reason:** Runs inside the existing Docker stack with zero external
dependencies. Handles compression, rotation, and scheduling. Simpler
and more reliable than a host-level cron job.
**Consequences:** Backups stored in `./backups/` on the host.
Restore requires manual `gunzip` + `psql` (documented in README).

### ADR-013: Environment Validation and Startup Guards

**Date:** 2026-03-17
**Status:** Accepted
**Context:** Missing or invalid environment variables (especially
`POSTGRES_PASSWORD`) cause cryptic runtime errors deep in the
connection stack.
**Decision:** Validate all environment variables at process start,
before any connections are attempted. Required variables cause
immediate exit with a clear error message. Port values are range-checked.
**Reason:** Fail-fast with actionable messages. A missing password
should say "Missing required environment variable: POSTGRES_PASSWORD",
not "FATAL: password authentication failed" from pg.
**Consequences:** `POSTGRES_PASSWORD` is now required — the previous
default of `changeme` is removed. Development setups must have a `.env`
file or exported variable.

### ADR-014: API Rate Limiting

**Date:** 2026-03-17
**Status:** Accepted
**Context:** Even a single-user app exposed on a network is vulnerable
to accidental or malicious request floods (e.g. a runaway script,
a misconfigured MCP client).
**Decision:** `express-rate-limit` on `/api` routes. 200 requests per
minute per IP. Health endpoint is exempt. Disabled in test mode.
**Reason:** Minimal configuration, no external dependencies (in-memory
store is fine for single-instance). 200/min is generous for normal use
but prevents floods.
**Consequences:** MCP clients or scripts making bulk operations may
need to throttle. Rate limit headers are included in responses
(`RateLimit-*` draft-7 standard).

## Non-Functional Requirements

### Performance
- Dashboard initial load: under 2 seconds on home network
- Item capture (create): under 500ms round trip
- Search results: under 1 second for full dataset (~800 items)
- Dependency graph rendering: under 1 second for up to 50 connected items

### Reliability
- Database: PostgreSQL WAL for crash recovery
- Backups: automated daily pg_dump via Docker backup container
  (7 daily, 4 weekly, 3 monthly retention, compressed .sql.gz)
- Health checks: Docker healthcheck on app container (curl /health),
  pg_isready on db container
- Environment validation: startup fails fast with clear messages
  if required variables are missing
- Rate limiting: 200 req/min per IP on API routes
- No data loss under any failure scenario — if the process crashes
  mid-operation, the database must be consistent on restart

### Responsive Design
- Desktop: full dashboard with sidebar + grid
- Tablet: sidebar collapsible, grid reduces to fewer columns
- Phone: single-column view, sidebar becomes a drawer

## Technology Versions (Phase 1)

| Component              | Version       | Rationale                        |
|------------------------|---------------|----------------------------------|
| Node.js                | 20 LTS        | Long-term support, stable        |
| Express                | 4.x           | Mature, well-documented          |
| React                  | 18.x          | Current stable, hooks support    |
| PostgreSQL             | 16.x          | Current stable, JSONB mature     |
| TypeScript             | 5.x           | Both frontend and backend        |
| Docker                 | Latest stable  | Container deployment             |
| Docker Compose         | v2            | Multi-container orchestration    |
| express-rate-limit     | 8.x           | API rate limiting                |
| @modelcontextprotocol/sdk | 1.x        | MCP server for AI agent access   |
| postgres-backup-local  | 16-alpine     | Automated daily DB backups       |
