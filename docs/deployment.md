# Deployment

**Last Updated:** 2026-05-26
**Status:** current
**Read when:** deploying, debugging the live server, SSH access, Docker issues

## Summary

notes-world runs on a shared VPS at 82.165.32.162. Apache terminates SSL and proxies to an nginx container, which serves the React SPA and proxies API requests to the Express container. Two SSH users: `chris` owns files, `claude` runs Docker.

## Live Environment

|              |                                                 |
| ------------ | ----------------------------------------------- |
| VPS IP       | 82.165.32.162                                   |
| URL          | https://notes-world.christopherrehm.de          |
| App path     | /opt/notes-world/                               |
| SSH (files)  | `ssh -i ~/.ssh/id_ed25519 chris@82.165.32.162`  |
| SSH (docker) | `ssh -i ~/.ssh/id_ed25519 claude@82.165.32.162` |

## Docker Stack

```
docker-compose.yml:
  app       — Express API (port 3001, internal)
  nginx     — serves SPA + proxies /api → app (port 8082, exposed)
  db        — PostgreSQL 16
  db-backup — daily pg_dump, 7 daily / 4 weekly / 3 monthly retention
```

Apache on the host proxies `notes-world.christopherrehm.de` → nginx on port 8082.

## Deploy Process

### 1. Build web locally

```bash
npm run build --workspace=packages/web
```

### 2. Rsync source (as chris)

```bash
rsync -az --delete --no-group \
  --exclude='node_modules' --exclude='.git' \
  --exclude='packages/web/dist' --exclude='packages/*/dist' \
  --exclude='backups' --exclude='.env' \
  -e "ssh -i ~/.ssh/id_ed25519" \
  /home/chris/ppp2/notes-world/ chris@82.165.32.162:/opt/notes-world/
```

### 3. Rsync built SPA (as chris)

```bash
rsync -az --no-group -e "ssh -i ~/.ssh/id_ed25519" \
  /home/chris/ppp2/notes-world/packages/web/dist/ \
  chris@82.165.32.162:/opt/notes-world/packages/web/dist/
```

### 4. Rebuild containers (as claude)

```bash
ssh -i ~/.ssh/id_ed25519 claude@82.165.32.162 \
  "cd /opt/notes-world && docker compose up --build -d 2>&1"
```

### 5. Verify

```bash
ssh -i ~/.ssh/id_ed25519 claude@82.165.32.162 \
  "docker compose -f /opt/notes-world/docker-compose.yml logs app --tail=20 2>&1"
```

Look for `Server running on port 3001 (production)` and any migration output.

## Bug reporting (GitHub issues)

The in-app "Report a bug" button files a GitHub issue in `johnfire/notes-world`.

- Create a **fine-grained PAT** scoped to `johnfire/notes-world` only, with
  **Issues: Read and write** permission.
- Set it on the server container as `GITHUB_TOKEN`. Optionally override the
  target repo with `GITHUB_REPO` (`owner/repo`, default `johnfire/notes-world`).
- If `GITHUB_TOKEN` is unset, the endpoint returns `503` and the feature is
  simply disabled — the server still runs.
- Ensure the `bug` and `user-reported` labels exist in the repo (GitHub ships a
  `bug` label by default; create `user-reported` once):
  `gh label create user-reported --repo johnfire/notes-world --color ededed`

## Notes

- Node is NOT installed on the VPS host — build web locally before rsyncing
- Migrations run automatically on server startup — no manual step needed
- Use `--no-group` on rsync — `chris` can write files but not change group ownership
- Backups stored in `/opt/notes-world/backups/` on the host
- The deploy-notes-world Claude skill automates all of the above
