# notes-world

A personal productivity dashboard that consolidates notes, ideas, tasks, and reminders into a single structured view with tags, priorities, and dependencies.

## Quickstart

```bash
# 1. Bootstrap
./scripts/setup.sh

# 2. Edit .env — set POSTGRES_PASSWORD
# 3. Run migrations
npm run migrate

# 4. Start development servers
npm run dev
# → API:    http://localhost:3001
# → Client: http://localhost:5173
```

## Production (Docker)

```bash
cp .env.example .env
# set POSTGRES_PASSWORD in .env
docker compose up --build
# → http://<your-machine-ip>:3001
```

## Tech Stack

| Layer    | Tech                              |
|----------|-----------------------------------|
| Frontend | React 18 + TypeScript + Vite      |
| Styling  | Tailwind CSS (dark theme)         |
| Backend  | Node 20 + Express 4 + TypeScript  |
| Database | PostgreSQL 16 (raw SQL)           |
| Deploy   | Docker Compose                    |

## Structure

```
notes-world/
├── src/
│   ├── client/          # React frontend
│   ├── server/          # Node/Express backend
│   │   └── src/
│   │       ├── domains/ # items, relationships, views
│   │       ├── db/      # migrations, client
│   │       └── events/  # in-process event bus
│   └── mcp/             # MCP server for AI agent access
├── scripts/             # setup, migrate
├── config/              # environment configs
├── tests/               # unit, integration, e2e
└── *.ispec *.policy     # domain specs (source of truth)
```

## Database Backups

The Docker Compose stack includes automatic daily database backups via [postgres-backup-local](https://github.com/prodrigestivill/docker-postgres-backup-local).

**Retention policy:**
- 7 daily backups
- 4 weekly backups
- 3 monthly backups

Backups are stored in `./backups/` as compressed `.sql.gz` files.

### Manual backup

```bash
docker compose exec db-backup /backup.sh
```

### Restore from backup

```bash
# 1. Stop the app (keep db running)
docker compose stop app

# 2. Decompress the backup
gunzip -k backups/daily/notes_world-YYYYMMDD-HHMMSS.sql.gz

# 3. Restore into the database
docker compose exec -T db psql -U notes_world -d notes_world < backups/daily/notes_world-YYYYMMDD-HHMMSS.sql

# 4. Restart
docker compose up -d app
```

### Set backup timezone

Add `TZ` to your `.env` file (defaults to UTC):

```
TZ=America/Chicago
```

## MCP Server

An MCP (Model Context Protocol) server lets AI agents (Claude Code, Claude Desktop, Cursor, etc.) interact with your notes-world data directly.

### Setup

```bash
# Build the MCP server
cd src/mcp && npm run build
```

The MCP server connects to the notes-world REST API, so the main app must be running.

### Configure for Claude Code

Add to `.claude/settings.json` or `~/.claude.json`:

```json
{
  "mcpServers": {
    "notes-world": {
      "command": "node",
      "args": ["/path/to/notes-world/src/mcp/dist/index.js"],
      "env": {
        "NOTES_WORLD_API_URL": "http://localhost:3001"
      }
    }
  }
}
```

### Configure for Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `~/.config/Claude/claude_desktop_config.json` (Linux):

```json
{
  "mcpServers": {
    "notes-world": {
      "command": "node",
      "args": ["/path/to/notes-world/src/mcp/dist/index.js"],
      "env": {
        "NOTES_WORLD_API_URL": "http://localhost:3001"
      }
    }
  }
}
```

### Available tools

| Tool | Description |
|------|-------------|
| `create_item` | Create a new item |
| `get_item` | Get item by ID |
| `update_item` | Update title, body, or color |
| `promote_item` | Promote untyped item to Task/Idea/Note/Reminder |
| `archive_item` | Archive (soft delete) an item |
| `restore_item` | Restore from archive |
| `get_recent_items` | List recently updated items |
| `get_trash` | List archived items |
| `search_items` | Full-text search across items |
| `list_tasks` | List all tasks with status/priority |
| `start_task` | Move task to In Progress |
| `complete_task` | Mark task as done |
| `block_task` | Mark task as blocked |
| `list_ideas` | List ideas by maturity |
| `list_notes` | List all notes |
| `list_tags` | List tags with usage counts |
| `create_tag` | Create a new tag |
| `tag_item` | Add a tag to an item |
| `untag_item` | Remove a tag from an item |
| `get_items_for_tag` | Get items with a specific tag |
| `get_tags_for_item` | Get tags on an item |
| `rename_tag` | Rename a tag |
| `delete_tag` | Delete a tag |
| `export_tag` | Export tag's items as markdown |
| `export_untagged` | Export untagged items as markdown |

## HTTPS / Reverse Proxy

In production, run behind a reverse proxy for TLS termination. Example with Caddy (auto-HTTPS):

```
# Caddyfile
notes.example.com {
    reverse_proxy localhost:3001
}
```

Or with nginx:

```nginx
server {
    listen 443 ssl;
    server_name notes.example.com;

    ssl_certificate     /etc/letsencrypt/live/notes.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/notes.example.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

The app includes rate limiting (200 req/min per IP) and security headers via Helmet.

## Development

```bash
npm run dev              # start both servers
npm test                 # run all tests
npm run lint             # lint all code
npm run migrate          # apply pending migrations
```

## Support

If you find this useful, a small donation helps keep projects like this going:
[Donate via PayPal](https://paypal.me/christopherrehm001)
