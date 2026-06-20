# notes-world Deployment Handoff

_Created: 2026-05-21_

## What we did this session

- Reviewed the notes-world monorepo restructure (was sitting uncommitted for weeks)
- Renamed old `src/` to `src-desktop/` to preserve the desktop version
- Committed everything (332 files) — branch: master, commit: 56aa8b1
- Identified the deployment target: same VPS as art-platform

## Server

**IP:** 82.165.32.162
**SSH:** `ssh -i ~/.ssh/id_ed25519 claude@82.165.32.162`
**OS:** Ubuntu 24.04, Apache front proxy, Docker behind it
**Certbot SSL already running** for existing domains

## Plan: deploy notes-world as notes.christopherrehm.de

### Waiting on

- Chris to add DNS A record: `notes.christopherrehm.de → 82.165.32.162`

### Steps once DNS is live

1. SSH into server
2. Clone repo: `git clone <repo> /opt/notes-world`
3. Create `.env` from `.env.example`:
   - `POSTGRES_PASSWORD=<strong password>`
   - `JWT_SECRET=<node -e "console.log(require('crypto').randomBytes(64).toString('hex'))">`
   - `NGINX_HOST=notes.christopherrehm.de`
   - `TZ=Europe/Berlin`
4. Build SPA: `npm ci && npm run build -w packages/web`
5. Start stack: `docker compose up -d`
6. Add Apache vhost to proxy `notes.christopherrehm.de` → notes-world nginx container port
7. Run certbot for SSL on the new subdomain
8. Verify health endpoint: `curl https://notes.christopherrehm.de/health`

## Code structure (notes-world)

- `packages/server` — Express API (TypeScript)
- `packages/web` — React SPA (Vite)
- `packages/shared` — shared types
- `packages/mcp` — MCP server for AI agent access
- `packages/importer` — Python markdown importer
- `src-desktop/` — preserved old single-package structure (reference only)
- `docker-compose.yml` — production stack (app + nginx + postgres + certbot + db-backup)
- `docker-compose.dev.yml` — local dev stack

## Broader VPS migration (future)

artcrm and eng-crm also planned to move to the same server eventually.
DB dumps available at `/home/chris/ppp2/dumps/`
