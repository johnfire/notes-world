# Guides Section (`/guides`) — Design

**Date:** 2026-06-10
**Status:** Approved
**Issue:** #67 (deferred from #65)

## Goal

Add an evergreen guides/how-to section to the marketing site for ongoing
indexable content that targets real search queries and helps new users learn the
app. Reuses the data-driven content pattern, `MarketingLayout`, and `Seo`
component introduced in #65.

## Scope

Four starter guides at launch (full copy drafted by Claude, reviewed by Chris):

1. `organise-notes-with-tags` — "How to organise notes with tags instead of folders"
2. `capture-ideas-fast` — "How to capture ideas fast before you forget them"
3. `notes-tasks-reminders-one-app` — "Notes, tasks, and reminders in one app (not three)"
4. `use-ai-with-your-notes` — "How to use AI with your notes via MCP"

Topics iterate from Search Console data in ~2 weeks (follow-up, not in scope here).

## Content model

`packages/web/src/content/guides.ts` — same shape as `useCases.ts` plus a date:

```ts
interface GuideSection {
  h2: string;
  body: string;
}
interface Guide {
  slug: string;
  seoTitle: string;
  seoDescription: string;
  h1: string;
  intro: string;
  sections: GuideSection[];
  datePublished: string; // ISO date, e.g. "2026-06-10"
  ctaLabel: string;
}
export const guideList: Guide[];
export function getGuide(slug: string): Guide | undefined;
export function buildGuideJsonLd(guide: Guide): object; // schema.org Article
```

`buildGuideJsonLd` returns an `Article`: `headline` (h1), `description`
(seoDescription), `datePublished`, `author`/`publisher` = "Notes World",
`mainEntityOfPage` = the canonical guide URL.

## Pages

- **`GuidesIndexPage.tsx`** → `/guides`. Single `<h1>` ("Guides" / "Notes World
  Guides"), `Seo` meta, and a list of every guide rendered as a linked title +
  intro snippet. Acts as the hub linking to all articles.
- **`GuidePage.tsx`** → `/guides/:slug`. Looks up the guide via `getGuide`. If
  missing, `<Navigate to="/guides" replace />`. Otherwise renders inside
  `MarketingLayout`: `Seo` (title/description/canonical), single `<h1>`, the
  `<h2>`+`<p>` sections, a sign-up CTA, and the `Article` JSON-LD (same
  `<script type="application/ld+json">` approach as `FaqPage`).

Both mirror `UseCasePage.tsx` structure and styling so the look is consistent.

## Wiring

- **Routing** (`App.tsx`): add `<Route path="/guides" .../>` and
  `<Route path="/guides/:slug" .../>`. Dynamic lookup means new guides need only
  a `guides.ts` entry — no routing change.
- **Sitemap** (`packages/web/public/sitemap.xml`): add `/guides` and the four
  `/guides/<slug>` URLs (non-www host, consistent with existing entries).
- **Footer** (`MarketingLayout`): add a "Guides" link alongside the existing
  marketing links.

## Error handling

- Unknown `/guides/:slug` → redirect to `/guides` (no broken/empty article page).
- Index page with an empty list would render just the heading (not possible at
  launch — four guides ship).

## Testing (TDD)

- `content/guides.test.ts` — slugs unique & URL-safe; every guide has non-empty
  required fields and ≥2 sections; `getGuide` returns the right one / `undefined`
  for misses; `buildGuideJsonLd` has `@type: "Article"`, headline, datePublished.
- `pages/GuidePage.test.tsx` — renders the h1 + all section h2s + CTA for a known
  slug; redirects for an unknown slug; emits the JSON-LD script.
- `pages/GuidesIndexPage.test.tsx` — renders an `<h1>` and a link to each guide.
- Update `MarketingLayout.test.tsx` to assert the new "Guides" footer link.

## Out of scope

- Search Console-driven topic iteration (later).
- Markdown/CMS authoring — guides are TS data, same as use-cases (YAGNI).
- Pagination / categories — four guides don't need it.
