# Backlinks & Off-Site Authority — Tracker (#66)

Goal: earn quality inbound links to **https://notes-world.christopherrehm.de** to build domain authority. Track submissions here; monitor referrals + indexed backlinks in Google Search Console (Links report) and the Performance → referral traffic.

## Positioning (one source of truth — keep copy consistent)

- **What:** A personal productivity app that unifies **notes, ideas, tasks, and reminders** in one structured view with tags, priorities, and dependencies.
- **Platforms:** Web + Android.
- **Differentiators:** (1) **MCP server** — AI assistants (Claude, etc.) can read/write your notes directly; (2) **self-hostable** via Docker; (3) one place for notes _and_ tasks _and_ reminders, not three apps.
- **Confirm before publishing:** pricing of the hosted version (free? free tier?), and **add a LICENSE** if you want to claim open-source on r/selfhosted / AlternativeTo (currently no LICENSE file — repo is "source available", not OSS).

## Owned-property cross-links (in our control)

| Source                               | Link present?                            | Notes                                                                                   |
| ------------------------------------ | ---------------------------------------- | --------------------------------------------------------------------------------------- |
| christopherrehm.de `/portfolio.html` | ✅ dofollow                              | Descriptive anchor + use-case text. **Now added to sitemap** (was missing).             |
| christopherrehm.de `robots.txt`      | ✅ restored                              | Was 404 in prod — lost the Sitemap pointer. Restored + non-www. **Needs deploy (scp).** |
| GitHub repo `johnfire/notes-world`   | ⚠️ homepage points to christopherrehm.de | Consider pointing repo homepage → the app URL.                                          |
| flashkarte site footer               | ☐ TODO                                   | Cross-link the sibling apps (flashkarte ↔ notes-world ↔ leguilde).                      |
| leguilde.art footer                  | ☐ TODO                                   | Same — small owned-app link network.                                                    |

## Directory / community submissions (manual — needs your accounts)

| Target                      | Type      | DoFollow?  | Submitted | Live URL | Notes                                                                                                |
| --------------------------- | --------- | ---------- | --------- | -------- | ---------------------------------------------------------------------------------------------------- |
| Product Hunt                | Launch    | nofollow\* | ☐         |          | \*PH links are nofollow but drive referral traffic + secondary pickups. Pick a launch day (Tue–Thu). |
| AlternativeTo               | Directory | dofollow   | ☐         |          | List as alternative to Notion / Google Keep / Todoist.                                               |
| SaaSHub                     | Directory | dofollow   | ☐         |          |                                                                                                      |
| Slant                       | Directory | varies     | ☐         |          | Add to "best note-taking apps" questions.                                                            |
| Awesome-Selfhosted (GitHub) | List/PR   | nofollow   | ☐         |          | Only if a LICENSE is added (list requires OSS). High-quality audience.                               |
| r/productivity              | Community | nofollow   | ☐         |          | Value-first post, not a drop-link. Disclose it's yours.                                              |
| r/selfhosted                | Community | nofollow   | ☐         |          | Lead with Docker self-host + MCP angle. Disclose.                                                    |
| Hacker News (Show HN)       | Community | nofollow   | ☐         |          | "Show HN: Notes app with an MCP server for AI access".                                               |
| Indie Hackers               | Community | dofollow   | ☐         |          | Product page + build-in-public post.                                                                 |

\* nofollow links still matter: referral traffic, brand searches, and they often get re-shared into dofollow contexts.

## Cadence

- Don't blast everything in one day — spread submissions over 2–3 weeks so the backlink profile looks organic.
- After ~2 weeks, pull Search Console query data and iterate the use-case page titles/descriptions (#65 follow-up).
