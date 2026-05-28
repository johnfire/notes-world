# Database

**Last Updated:** 2026-05-26
**Status:** current
**Read when:** schema questions, migrations, backups, data model decisions

## Summary

PostgreSQL 16, accessed via raw SQL with the `pg` driver — no ORM. Migrations are plain SQL files that run automatically on startup. Every table has a `user_id` column so multi-tenancy can be added with one migration rather than a rewrite.

## Key Design Decisions

- **No ORM** — raw SQL via `pg`. Full control, no abstraction surprises.
- **user_id on every table** — Phase 1 uses hardcoded constant `00000000-0000-0000-0000-000000000001`. Adding real auth means making that filter dynamic, not restructuring tables.
- **JSONB for type-variant fields** — items can be promoted to Task/Idea/Note/Reminder. Type-specific fields live in a JSONB column so the relational core stays clean.
- **Migrations only go forward** — never edit existing migration files. Only add new ones.

## Migrations

Location: `packages/server/src/db/migrations/`

- Files are plain `.sql`, named with a timestamp prefix
- Run automatically at startup before the server accepts requests
- Never edit an existing migration — always add a new file

## Limits & Policies

| Resource               | Limit                              |
| ---------------------- | ---------------------------------- |
| Item title             | 300 characters                     |
| Item body              | 50,000 characters                  |
| Tags per item          | 20                                 |
| Tag name               | 100 characters, lowercase, trimmed |
| Dependencies per item  | 50                                 |
| Dependency graph depth | 20 levels                          |
| Import batch           | 500 items, 10 MB max file          |
| Pagination default     | 50 items                           |
| Pagination max         | 200 items                          |

## Backup

- **Method:** `prodrigestivill/postgres-backup-local` Docker container
- **Schedule:** Daily
- **Retention:** 7 daily, 4 weekly, 3 monthly
- **Format:** compressed `.sql.gz`
- **Location:** `./backups/` on host (`/opt/notes-world/backups/` on VPS)
- **Restore:** `gunzip dump.sql.gz | psql <connection>`

## Archive Policy

Archived items are never deleted. They are excluded from default views but remain searchable and retain all relationships.
