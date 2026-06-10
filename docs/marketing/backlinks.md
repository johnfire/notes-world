# Backlinks & Off-Site Authority — Tracker (#66)

Goal: earn quality inbound links to **https://notes-world.christopherrehm.de** to build domain authority. Track submissions here; monitor referrals + indexed backlinks in Google Search Console (Links report) and Performance → referral traffic.

## Positioning (one source of truth — keep copy consistent)

- **What:** A personal productivity app that unifies **notes, ideas, tasks, and reminders** in one structured view with tags, priorities, and dependencies.
- **Platforms:** Web + Android.
- **Differentiators:** (1) **MCP server** — AI assistants (Claude, etc.) can read/write your notes directly; (2) one place for notes _and_ tasks _and_ reminders, not three apps.
- **License:** **Proprietary / hosted-only** (all rights reserved). Do NOT pitch as open source or self-hostable. This rules out OSS channels (Awesome-Selfhosted, AlternativeTo's open-source filter) — lead with the hosted product + AI/MCP angle instead.
- **Confirm before publishing:** pricing of the hosted version (free? free tier?).

## Owned-property cross-links (in our control)

| Source                               | Link present?                            | Notes                                                            |
| ------------------------------------ | ---------------------------------------- | ---------------------------------------------------------------- |
| christopherrehm.de `/portfolio.html` | ✅ dofollow                              | Descriptive anchor + use-case text. Added to sitemap + deployed. |
| christopherrehm.de `robots.txt`      | ✅ live (HTTP 200)                       | Was 404 in prod — restored with Sitemap pointer, non-www.        |
| GitHub repo `johnfire/notes-world`   | ⚠️ homepage points to christopherrehm.de | Consider pointing repo homepage → the app URL.                   |
| flashkarte site footer               | ☐ TODO                                   | Cross-link sibling apps (flashkarte ↔ notes-world ↔ leguilde).   |
| leguilde.art footer                  | ☐ TODO                                   | Same — small owned-app link network.                             |

## Directory / community submissions (manual — needs your accounts)

| Target                | Type      | DoFollow?  | Submitted | Live URL | Notes                                                                                  |
| --------------------- | --------- | ---------- | --------- | -------- | -------------------------------------------------------------------------------------- |
| Product Hunt          | Launch    | nofollow\* | ☐         |          | Pick a launch day (Tue–Thu). Drives referral traffic + secondary pickups.              |
| AlternativeTo         | Directory | dofollow   | ☐         |          | General/freemium listing (NOT the open-source filter). Alt to Notion / Keep / Todoist. |
| SaaSHub               | Directory | dofollow   | ☐         |          |                                                                                        |
| Slant                 | Directory | varies     | ☐         |          | Add to "best note-taking apps" questions.                                              |
| r/productivity        | Community | nofollow   | ☐         |          | Value-first post, disclose it's yours.                                                 |
| r/ClaudeAI, r/mcp     | Community | nofollow   | ☐         |          | Strongest fit — lead with the MCP/AI angle.                                            |
| Hacker News (Show HN) | Community | nofollow   | ☐         |          | "Show HN: Notes app with an MCP server for AI access".                                 |
| Indie Hackers         | Community | dofollow   | ☐         |          | Product page + build-in-public post.                                                   |

\* nofollow links still matter: referral traffic, brand searches, and they often get re-shared into dofollow contexts.

## Dropped (incompatible with proprietary license)

- ~~r/selfhosted~~, ~~Awesome-Selfhosted~~ — require self-hostable / OSS. Not applicable.

## Cadence

- Don't blast everything in one day — spread submissions over 2–3 weeks so the backlink profile looks organic.
- After ~2 weeks, pull Search Console query data and iterate the use-case page titles/descriptions (#65 follow-up).
