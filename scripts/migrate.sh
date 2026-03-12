#!/usr/bin/env bash
set -euo pipefail

if [ ! -f .env ]; then
  echo "ERROR: .env not found. Run ./scripts/setup.sh first." >&2
  exit 1
fi

echo "==> Running database migrations"
npm run migrate
echo "==> Done"
