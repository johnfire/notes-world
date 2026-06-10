# User Docs — Fill Gaps + Discoverability — Design

**Date:** 2026-06-10
**Status:** Approved

## Goal

The in-app user guide at `/docs` (`packages/web/src/pages/DocsPage.tsx`) is solid
but missing coverage of several shipped features, and the landing-page top nav
doesn't link to it. Fill the content gaps and improve discoverability.

## Existing state

- `/docs` is a single-file React page with inline `Section` / `Sub` / `Code` /
  `Block` components and a `TOC` array driving a sidebar. Covers: Getting
  Started, Items, Tags, Dashboard, Import, Free vs Pro, API Keys, MCP. English-only
  (consistent with the marketing pages).
- `/docs` is already linked from: the in-app `Sidebar`, the landing-page footer,
  and the `MarketingLayout` footer.

## Content gaps to add (three new `Section`s + TOC entries)

1. **Checklists** — standalone simple lists, separate from the item system, with
   their own tab. Create a list, add items, check them off (the tile shows
   `checked/total`), rename, delete. Good for shopping lists, packing lists,
   repeatable routines.
2. **Dividers** — section headers inside a tag view. Add a divider, give it a
   label, and drag items beneath it to group them. Tap the chevron to
   **collapse/expand** a section, hiding or showing the items under it; a
   collapsed divider shows a count of hidden items. State syncs across web and
   the Android app.
3. **Mobile app** — there is an Android app sharing the same account as the web
   app. Users install it via the APK download on their Account page. Capture,
   tags, checklists, and dividers all work on mobile.

TOC ordering: insert **Checklists** and **Dividers** near the Tags/Dashboard
content; **Mobile app** after Dashboard (before Import). Exact order finalized in
implementation, kept logical.

## Discoverability

- **Landing top nav** (`LandingPage.tsx`): add a "Docs" link alongside the
  existing Features / Pricing / Sign-in items.
- **Cross-links:** add a "Guides" link from `/docs` (to `/guides`) and a "Full
  user guide" link from the `/guides` index (`GuidesIndexPage.tsx`) to `/docs`,
  so the SEO how-tos and the reference guide point at each other.

## Out of scope

- No refactor of `DocsPage` — extend the existing inline pattern.
- In-app onboarding tour / tooltips (a larger, separate effort).
- The stale APK version reference (`0.1.0` in the Account download link and
  `/api/mobile/version` vs the shipped `0.1.1`) — flagged separately; fix only if
  the user opts in.

## Testing

`DocsPage` currently has no test. Add `DocsPage.test.tsx` (mirrors the existing
page-test pattern: `HelmetProvider` + `MemoryRouter`) asserting:

- exactly one `h1`,
- the new section anchors (`#checklists`, `#dividers`, `#mobile-app`) render,
- a link to `/guides` is present.

For the cross-link and nav changes, extend the relevant existing tests
(`GuidesIndexPage.test`) to assert the `/docs` link, and add a landing-nav
assertion if `LandingPage` has a test; otherwise cover via the DocsPage/Guides
tests. No logic changes — these are content/link additions, so tests assert
presence rather than behavior.
