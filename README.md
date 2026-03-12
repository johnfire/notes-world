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
│   └── server/          # Node/Express backend
│       └── src/
│           ├── domains/ # items, relationships, views
│           ├── db/      # migrations, client
│           └── events/  # in-process event bus
├── scripts/             # setup, migrate
├── config/              # environment configs
├── tests/               # unit, integration, e2e
└── *.ispec *.policy     # domain specs (source of truth)
```

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
