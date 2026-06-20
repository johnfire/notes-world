# Vision

**Last Updated:** 2026-05-26
**Status:** current
**Read when:** making architectural decisions, evaluating new features, understanding long-term direction

## Summary

notes-world started as a personal productivity dashboard to consolidate fragmented notes. The long-term direction is shifting toward AI-as-interface: the database and AI become the product, the traditional UI becomes optional or generated on demand.

## Original Goal

Consolidate ~800 items scattered across 20 markdown notebook files into a single structured view with dependencies, priorities, and tags. Single user, home network, fast capture.

## Who It's For

One primary user — a software engineer and artist in Bavaria, working across several devices (Ubuntu laptop, Linux Mint desktop, Android phone and tablet). Captures ideas in bursts and organizes later; thinks in dependencies and priorities; values clean, logical, simple systems. The data model was built multi-tenant-ready from day one, so more users can be added without a core rewrite.

The original problem statement, success criteria, and Phase-1 scope/constraints/assumptions are archived in [`older-docs/context.md`](older-docs/context.md).

## Current State (2026-05-26)

Live at notes-world.christopherrehm.de. Multi-user with JWT auth, mobile app (Expo), admin panel, MCP server for AI access. In daily use.

## Long-Term Thinking

### AI as Interface

The traditional web UI may become secondary. Instead of navigating screens, a user asks the AI "what's on my task list" and the AI queries the database and returns a generated view. The interface is conversation, not navigation.

This means:

- The database and data model are the core product
- The AI needs fast, structured access to user data (MCP server already provides this)
- The React frontend becomes one possible interface, not the only one

### Generated Artifacts

Rather than maintaining a static UI, the AI generates views on demand. A user says "show me tasks grouped by tag" and gets that specific layout. Another user gets a different layout based on their preferences. Same data, different rendering each time.

User formatting preferences must be stored in the database — not re-derived from conversation history each time — to minimize token usage.

### Local-First Hybrid

Security concern: data on a web server is less secure than data on a local device. Long-term model:

- Data lives locally on the user's device
- Cloud is the sync layer, not the primary store
- AI assistant runs locally with fast access to local data
- Sync happens automatically when connected (CRDTs for conflict-free offline writes)
- Tools like ElectricSQL or PowerSync handle the sync layer

This is not yet planned for implementation — still being evaluated.

### Token Efficiency Principle

Never use more tokens than needed. Implications:

- User preferences stored in DB, not re-derived from chat history
- MCP tools return structured JSON with everything the AI needs upfront
- Compact user profile read at session start rather than discovery through conversation
- The database is the memory; conversation is just the interface

### Why notes-world is Well-Positioned

- Already Dockerized — local deployment is `docker compose up`
- MCP server already exists — AI can query and write data today
- user_id on every table — multi-tenancy is one migration away
- The data model is sound and can outlast any particular UI
