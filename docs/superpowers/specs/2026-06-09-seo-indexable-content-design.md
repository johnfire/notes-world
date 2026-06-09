# SEO: indexable content pages — design

Issue: #65. Adds real, indexable content pages so Google has something to rank
beyond the one-screen landing page. Technical SEO (meta, OG, sitemap, JSON-LD,
canonicals) is already done; this issue adds the content surface.

## Scope

In scope:

- Three use-case pages, each a real route with unique `Seo` meta:
  - `/notes-app` — "Note-taking app"
  - `/task-manager` — "Task manager"
  - `/reminders` — "Reminders app"
- One `/faq` page with `FAQPage` JSON-LD structured data.
- Sitemap entries for all four new routes.
- A "Use cases" link row in the landing-page footer so crawlers reach the new
  pages from the homepage.

Out of scope (deferred to a follow-up issue):

- Blog / guides section.
- Translating the new pages into the 24 configured UI languages. New pages are
  **English-only**. Rationale: the app supports 24 EU languages; translating
  marketing copy 24× is high-effort and low-quality without human review. SEO
  targets English queries first; revisit with real Search Console data.

## Architecture

All new pages are public, eagerly imported in `App.tsx` (same as
`LandingPage`/`DocsPage`/etc.) — they must be crawlable and fast, not behind the
lazy-loaded `AppShell`.

### `MarketingLayout` (new component)

`packages/web/src/components/MarketingLayout.tsx`

Provides shared chrome for the new content pages:

- Slim sticky nav: logo (links to `/`) + "Sign in" and "Get started" links to
  `/login`. English-only, **no** language switcher.
- The footer markup currently inline in `LandingPage` (copyright + Sign in /
  Docs / Privacy / Terms / Impressum links).
- Renders `children` between nav and footer.
- Matches the landing page's dark theme (`bg-[#0f0f0f] text-[#f0f0f0]`).

`LandingPage` is **not** refactored to consume this — it keeps its own nav
(which has the i18n language switcher and pricing anchors). This avoids any risk
to the live homepage. Some nav/footer markup is duplicated between
`LandingPage` and `MarketingLayout`; that is an accepted, deliberate trade-off
to keep the homepage untouched.

What it does: page shell for marketing/content routes. How to use it:
`<MarketingLayout><main>…</main></MarketingLayout>`. Depends on: `react-router`
`Link`, `Seo` is supplied by the page (not the layout).

### `UseCasePage` (new component, data-driven)

`packages/web/src/pages/UseCasePage.tsx`

One component rendering from a `UseCase` data object:

```ts
interface UseCaseSection {
  h2: string;
  body: string;
}
interface UseCase {
  slug: string; // e.g. "notes-app" → path "/notes-app"
  seoTitle: string;
  seoDescription: string;
  h1: string;
  intro: string;
  sections: UseCaseSection[];
  ctaLabel: string; // e.g. "Start taking notes"
}
```

The three use cases live in a `useCases` array in
`packages/web/src/content/useCases.ts` (keyed by slug). Each route renders
`<UseCasePage useCase={useCases.notesApp} />`.

Page structure (inside `MarketingLayout`):

- `Seo` with the use case's `seoTitle`, `seoDescription`, `path="/<slug>"`.
- `<main>` with exactly one `<h1>` (the `h1` field), an intro `<p>`, then one
  `<section>` per `sections` entry with an `<h2>` and body `<p>`.
- A CTA `Link` to `/login`.
- An internal-links block: links to the other two use-case pages and to `/faq`.
  Internal linking helps crawl + indexing.

### `FaqPage` (new component)

`packages/web/src/pages/FaqPage.tsx`, content in
`packages/web/src/content/faqs.ts` as `faqs: { q: string; a: string }[]`.

- Wrapped in `MarketingLayout`, with `Seo` (`path="/faq"`).
- Single `<h1>` ("Frequently asked questions"), then the Q&A list as semantic
  markup (`<h2>` per question or a `<dl>`/`<dt>`/`<dd>` structure — one of these,
  used consistently).
- Injects `FAQPage` structured data built from the **same** `faqs` array via
  `react-helmet-async`:

  ```tsx
  <Helmet>
    <script type="application/ld+json">{JSON.stringify(faqLd)}</script>
  </Helmet>
  ```

  where `faqLd` is `{ "@context": "https://schema.org", "@type": "FAQPage",
mainEntity: faqs.map(f => ({ "@type": "Question", name: f.q,
acceptedAnswer: { "@type": "Answer", text: f.a } })) }`.

  Building the JSON-LD from the rendered array guarantees the structured data
  matches the visible content (a Google requirement for FAQ rich results).

FAQ content: ~6–8 honest questions — what Notes World is, is it free, the Pro
tier, data/privacy, mobile app, AI/MCP access, self-hosting/import. Answers must
not overstate a prototype.

## Wiring

- `App.tsx`: add four `<Route>`s (`/notes-app`, `/task-manager`, `/reminders`,
  `/faq`) above the `*` catch-all, importing the new pages eagerly.
- `public/sitemap.xml`: add four `<url>` entries (`changefreq: monthly`,
  `priority: 0.6` for use cases, `0.5` for FAQ).
- `LandingPage` footer: add a "Use cases" row linking to the three use-case
  pages and `/faq`. Only addition to `LandingPage`; nav/hero untouched.
- `robots.txt`: no change — `/` is already allowed; new routes are not under the
  disallowed `/app` or `/api/`.

## SEO hygiene (applies to every new page)

- Exactly one `<h1>`; descriptive `<h2>`s.
- Unique `<title>` and meta description via `Seo` (self-referencing canonical is
  handled by the existing `Seo` component).
- Real internal links between pages.
- Honest copy consistent with the app's prototype status — no fabricated claims,
  metrics, or testimonials.
- No images planned. If any decorative image is added it must have meaningful
  `alt` text.

## Testing

Project uses `vitest run` + Testing Library + jsdom (see existing
`src/components/*.test.tsx`). Add `src/pages/seoPages.test.tsx` (or per-page
tests following the existing pattern) asserting:

1. Each use-case page and the FAQ page renders exactly one `<h1>`.
2. Each page renders a non-empty document `<title>` (via `HelmetProvider` /
   `react-helmet-async` in the test render).
3. The FAQ page emits a `<script type="application/ld+json">` whose parsed JSON
   has `@type === "FAQPage"` and `mainEntity.length === faqs.length`.

Tests render with the same providers the pages need (`HelmetProvider`,
`MemoryRouter`). Run `npm test` (root) — must stay green.

## Acceptance criteria (maps to issue #65 checklist)

- [x] Feature/use-case pages — `/notes-app`, `/task-manager`, `/reminders`, each
      with unique `Seo` title/description.
- [x] FAQ page with `FAQPage` JSON-LD.
- [ ] Blog/guides — explicitly deferred; follow-up issue filed.
- [x] Every new public route added to `public/sitemap.xml`.
- [x] Single h1 + descriptive h2s on each page; alt text rule documented.
