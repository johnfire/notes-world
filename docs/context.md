# Context — Personal Productivity Dashboard

## The Problem

Information is scattered. The user has approximately 20 notebook files,
each containing 5 to 40 notes, ideas, tasks, and reminders. That is
potentially 100 to 800 discrete items with no structure connecting them.

There is no differentiation between an idea, a task, a note, and a
reminder. There are no dependencies between items. There are no
priorities visible across notebooks. There is no way to see the
big picture — what matters, what blocks what, what to do next.

The result: things get lost. The user cannot find items when needed.
Related ideas are not linked. Work stalls because dependencies are
invisible. The user does not know where to start.

This is not a problem of insufficient information. The information
exists. The problem is that it is opaque — flat lists in isolated
files with no relationships, no ranking, and no cross-referencing.

## Who Uses This

**Phase 1:** A single user — a software engineer and artist living
in Bavaria, working across multiple devices (Ubuntu laptop, Linux Mint
desktop, Android phone, Android tablet). The user values clean systems,
logical structure, and simplicity. The user captures ideas in bursts
and organizes later. The user thinks in terms of dependencies and
priorities but currently has no tool that makes them visible.

**Future phases:** The system is designed so that multi-tenancy can
be added without rewriting the core. But Phase 1 is single-user only.

## What Success Looks Like

Six months from now, the user opens the dashboard and:

- Sees all active items across every former notebook in one view
- Knows immediately what is highest priority
- Can see what is blocked and what is blocking it
- Can find any item by search, tag, or relationship
- Has promoted raw ideas into structured tasks with dependencies
- Spends less than 10 seconds deciding what to work on next
- Has not lost a single item that was captured

Measurable criteria:
- All items from existing markdown notebooks are imported and tagged
- Every task has a priority and at least basic dependency mapping
- The dashboard loads in under 2 seconds on all devices
- Item capture (new item with text only) takes under 3 seconds

## What Is Out of Scope

Phase 1 explicitly does NOT include:

- Calendar integration
- Collaboration or sharing
- Email integration
- Time tracking
- File attachment management (beyond text content)
- AI-assisted prioritization or suggestions
- Conditional dependencies (deferred to Phase 2)
- Multi-user authentication and authorization
- Mobile native apps (web responsive is sufficient)

## Constraints

- Must run in a browser — accessible from Ubuntu, Linux Mint, Android
- Phase 1 deployment: Docker on home network (desktop or laptop)
- Tech stack: React frontend, Node/Express backend, PostgreSQL database
- Must handle the full existing dataset (~800 items) without performance issues
- Must be architected so multi-tenant can be added without core rewrite
- All user content must be preserved — no destructive operations

## Assumptions

These are taken as true. If any are wrong, the architecture may need revision:

- The user's existing markdown files can be parsed into discrete items
  with reasonable accuracy (assumption: each note/idea is separated by
  a consistent delimiter — heading, horizontal rule, or blank lines)
- 800 items is a reasonable upper bound for Phase 1 data volume
- The home network is reliable enough for daily use
- A single PostgreSQL instance is sufficient for Phase 1 scale
- The user will invest time in initial organization (promoting items,
  adding tags and dependencies) after import — the system cannot
  infer all structure automatically
