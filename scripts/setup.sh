#!/usr/bin/env bash
set -euo pipefail

echo "==> notes-world setup"

# Check prerequisites
for cmd in node npm docker; do
  if ! command -v "$cmd" &>/dev/null; then
    echo "ERROR: $cmd is required but not installed." >&2
    exit 1
  fi
done

NODE_VER=$(node --version | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VER" -lt 20 ]; then
  echo "ERROR: Node 20+ required (found $NODE_VER)" >&2
  exit 1
fi

# Create .env if it doesn't exist
if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from .env.example — edit it with real values before running."
fi

# Install dependencies
echo "==> Installing dependencies"
npm install

# Ensure logs directory exists (gitignored)
mkdir -p ~/logs

echo ""
echo "Setup complete."
echo ""
echo "  Start dev servers:  npm run dev"
echo "  Run migrations:     npm run migrate"
echo "  Run tests:          npm test"
echo "  Docker production:  docker compose up --build"
echo ""
echo "Edit .env with your PostgreSQL password before starting."
