# Bug Reporting Feature — Design

**Issue:** #46 (enhancement, priority: high)
**Date:** 2026-05-31
**Status:** Approved, ready for implementation plan

## Summary

Let any logged-in user report a bug from inside the web app. The server enriches
the report with context and files it as a GitHub issue in
`johnfire/notes-world`, where the maintainer triages (label, assign, close).

## Flow

```
User clicks "Report a bug" (floating button)
      │
      ▼
Modal: description textarea → submit
      │
      ▼
POST /api/bug-reports  (auth required, rate-limited)
      │
      ▼
Server enriches with context + calls GitHub REST API
      │
      ▼
Issue created (labels: bug, user-reported)
      │
      ▼
Modal shows "Filed as #N" + link  →  maintainer triages in GitHub
```

## Decisions

- **Creation flow:** server files the issue directly via the GitHub REST API
  (synchronous). No "Claude in the loop", no queue. Nothing is lost because the
  issue is created in the request.
- **Who can report:** any logged-in user.
- **Persistence:** none. The GitHub issue is the only record (YAGNI).
- **Entry point:** a floating "Report a bug" button in the app shell, visible on
  authenticated pages, opening a modal.

## Server

New domain `bug-reports`, following the existing `domains/*` pattern
(routes → controller → service → types).

### `domains/bug-reports/bug-reports.routes.ts`

- `POST /api/bug-reports`, mounted in `app.ts` after `requireAuth`.
- Tight per-route rate limit (5 reports / 10 min per IP) layered on top of the
  global 200/min limiter, to prevent issue spam.

### `domains/bug-reports/bug-reports.controller.ts`

- Validates input: `description` required, trimmed, non-empty, max length
  (e.g. 5000 chars); optional `page` and `userAgent` from client, each capped
  (e.g. 200 / 500 chars) and treated as untrusted strings.
- Reads `req.userId` (set by `requireAuth`).
- Calls the service, returns `201` with `{ number, url }`.

### `domains/bug-reports/bug-reports.service.ts`

- Looks up the reporter's email via the auth repository (`req.userId` → email).
  Reporter identity is derived **server-side**, never trusted from the client.
- Builds the issue:
  - **Title:** `[Bug] <first line of description, truncated ~70 chars>`
  - **Body (markdown):** the user's description, then a `---` "Report context"
    section listing: reporter email + userId, page/route, user-agent (OS/browser),
    app version, ISO timestamp.
  - **Labels:** `bug`, `user-reported`.
- POSTs to `https://api.github.com/repos/{owner}/{repo}/issues` using Node 20's
  global `fetch` (no new dependency), with headers
  `Authorization: Bearer <token>`, `Accept: application/vnd.github+json`,
  `X-GitHub-Api-Version: 2022-11-28`.
- Returns `{ number, url }` from the GitHub response.

### `config/env.ts`

- Add optional `GITHUB_TOKEN` and `GITHUB_REPO` (`owner/repo`, default
  `johnfire/notes-world`).
- If `GITHUB_TOKEN` is unset, the endpoint returns `503 "bug reporting not
configured"` — the feature degrades gracefully and never crashes server startup.

## Web

### `components/BugReportButton.tsx`

- Floating button fixed in a corner of the app shell, rendered globally in
  `App.tsx`, shown only when authenticated.
- Opens a modal with a description textarea + submit/cancel.
- On submit, captures `window.location.pathname` and `navigator.userAgent` and
  calls the API.
- Success: "Thanks — filed as issue #N" with a link to the issue.
  Error: friendly message, form stays open so the text isn't lost.

### `api/index.ts`

- Add `submitBugReport({ description, page, userAgent })`.

### i18n

- Add the user-facing strings (button label, modal title, placeholder, success,
  error) to the locale files, matching the app's existing i18n usage.

## Secrets / Deployment

- GitHub token: a **fine-grained PAT** scoped to `johnfire/notes-world`
  only, with **Issues: read & write**. Created by the maintainer.
- Wired as the `GITHUB_TOKEN` env var on the server container on the VPS.
- The `bug` and `user-reported` labels created once in the repo (the default
  `bug` label usually already exists; `user-reported` is added once).
- Documented in `docs/deployment.md`.

## Error Handling

| Condition                          | Response                                   |
| ---------------------------------- | ------------------------------------------ |
| Missing/empty description          | `400` validation error                     |
| `GITHUB_TOKEN` not configured      | `503 "bug reporting not configured"`       |
| GitHub API non-2xx / network error | `502` friendly message; logged server-side |
| Rate limit exceeded                | `429`                                      |

## Testing

- **Server:** unit tests for the service (mocked global `fetch` — success, GitHub
  error, missing config) and controller (validation, happy path). Follow existing
  test patterns in the server package.
- **Web:** component test for the modal — submit calls the API with the captured
  page/user-agent and renders the success state; error path keeps the form open.

## Out of Scope

- Mobile (Expo) app entry point — web only for now.
- Screenshot/attachment upload.
- In-app list/status tracking of submitted reports.
- Claude-based enrichment of reports (can be added later as a separate step).
