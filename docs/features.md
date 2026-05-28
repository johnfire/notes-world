# Features

**Last Updated:** 2026-05-26
**Status:** current
**Read when:** understanding what's built, what's planned, current phase status

## Summary

Phase 1 is largely complete and live on the VPS. The app supports item capture, tagging, dashboard views, a mobile app, an MCP server for AI access, and an admin screen for user management.

## What's Built (Phase 1)

### Core

- Item capture, update, archive, restore
- Item type promotion: raw Item → Task / Idea / Note / Reminder
- Full-text search across items
- Tags: create, rename, delete, assign, remove
- Drag-and-drop ordering (per-context, persisted)
- Dashboard with configurable blocks
- Import: markdown files parsed into items with tags
- Export: markdown by tag, untagged, or all

### Block Types

- ActionableTasks, BlockedTasks, OverdueTasks
- RecentItems, ItemsByTag
- TagCloud, Notes, Ideas

### Auth & Users

- JWT authentication (login, session management)
- Multi-user accounts with roles (free, admin)
- Admin screen: create user accounts, visible password field for admin convenience
- API key auth for MCP server (SHA-256 hashed, revocable)

### Mobile App (Expo)

- React Native, Expo SDK 54, Expo Router
- Connects to live API at notes-world.christopherrehm.de
- Screens: Tags, Capture, Notes list, Item detail, Tag detail
- JWT stored in SecureStore
- Distributed via Expo Go (no Play Store yet)

### AI Access

- MCP server (stdio) in `packages/mcp`
- 25+ tools covering items, tasks, ideas, notes, tags (full CRUD + search + export)
- Requires API to be running; MCP calls REST, not DB directly

### Docs & Help

- In-app docs page at `/docs`
- Docs link in sidebar

## What's Planned

### Phase 2 — Dependencies & Task Lifecycle

- AddDependency, RemoveDependency, circular dependency detection
- CompleteTask, StartTask, BlockTask operations
- ActionableTasks, BlockedTasks, OverdueTasks block types (full)
- Markdown file upload UI + import report

### Phase 3 — Advanced Dependencies & Visualization

- Conditional dependencies (outcome-based, external, property-based)
- OR dependency logic
- DependencyGraph block with interactive visual graph
- Ideas maturity pipeline view
- Critical path highlighting

### Phase 4 — Multi-User & Auth Hardening

- Full multi-tenant auth (registration, session management)
- Data isolation (user_id filter becomes dynamic)
- HTTPS hardening, security scan

### Phase 5 — Calendar, Collaboration, AI

- Calendar integration
- Item sharing, shared tags
- AI-assisted "what to do next" suggestions
- AI-assisted classification on capture

## Current Reality vs Original Phase Plan

The original phases assumed strict sequencing. In practice Phase 1 expanded to include auth, multi-user, mobile app, and admin features that were originally Phase 4 concerns. The app is live and in daily use.
