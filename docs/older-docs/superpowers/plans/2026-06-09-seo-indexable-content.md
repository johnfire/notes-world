# SEO Indexable Content Pages — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three use-case pages (`/notes-app`, `/task-manager`, `/reminders`) and an FAQ page (`/faq` with `FAQPage` JSON-LD) so Google has real, indexable content to rank.

**Architecture:** New public routes, eagerly imported in `App.tsx` (not behind the lazy `AppShell`). A shared `MarketingLayout` supplies nav + footer chrome. Use-case pages are data-driven from a `useCases` map rendered by one `UseCasePage` component. The FAQ page renders a `faqs` array as semantic markup and injects matching `FAQPage` structured data built by a pure `buildFaqLd()` helper. English-only; the landing page is left untouched except for footer links.

**Tech Stack:** React 18, react-router-dom, react-helmet-async (`Seo` component), Tailwind, Vitest + Testing Library (jsdom, `globals: true`).

All paths below are relative to `packages/web/`. Run commands from repo root unless noted.

---

### Task 1: Content data — FAQ array + JSON-LD builder

**Files:**

- Create: `packages/web/src/content/faqs.ts`
- Test: `packages/web/src/content/faqs.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { faqs, buildFaqLd } from "./faqs";

describe("faqs content", () => {
  test("every FAQ has a non-empty question and answer", () => {
    expect(faqs.length).toBeGreaterThanOrEqual(6);
    for (const f of faqs) {
      expect(f.q.trim().length).toBeGreaterThan(0);
      expect(f.a.trim().length).toBeGreaterThan(0);
    }
  });

  test("buildFaqLd produces valid FAQPage structured data matching the array", () => {
    const ld = buildFaqLd();
    expect(ld["@context"]).toBe("https://schema.org");
    expect(ld["@type"]).toBe("FAQPage");
    expect(ld.mainEntity).toHaveLength(faqs.length);
    expect(ld.mainEntity[0]).toEqual({
      "@type": "Question",
      name: faqs[0].q,
      acceptedAnswer: { "@type": "Answer", text: faqs[0].a },
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace=packages/web -- src/content/faqs.test.ts`
Expected: FAIL — cannot resolve `./faqs`.

- [ ] **Step 3: Write the implementation**

```ts
export interface Faq {
  q: string;
  a: string;
}

export const faqs: Faq[] = [
  {
    q: "What is Notes World?",
    a: "Notes World is a personal productivity app that keeps your notes, ideas, tasks, and reminders in one place. You tag everything and find anything fast. It is an actively developed prototype in daily use.",
  },
  {
    q: "Is Notes World free?",
    a: "Yes. There is a free plan that covers everyday note-taking, tasks, and reminders. A Pro plan adds higher limits for people who want more.",
  },
  {
    q: "Can I use it on my phone?",
    a: "Yes. Besides the web app there is a mobile app built with Expo, so you can capture notes and check reminders on the go.",
  },
  {
    q: "How is my data handled?",
    a: "Your account data is private to you. See the Privacy Policy for the full details on what is stored and how it is used.",
  },
  {
    q: "Can I import my existing notes?",
    a: "Yes. Notes World can import Markdown files, so you can bring across notes you already keep in plain text.",
  },
  {
    q: "Can an AI assistant access my notes?",
    a: "Yes. Notes World ships an MCP server, so AI agents you authorize can read and create items on your behalf through a secure connection.",
  },
  {
    q: "How do tags work?",
    a: "Every item can carry one or more colored tags. You filter by tag to pull up just your work notes, just your ideas, or whatever slice you need.",
  },
];

export function buildFaqLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test --workspace=packages/web -- src/content/faqs.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/content/faqs.ts packages/web/src/content/faqs.test.ts
git commit -m "feat(seo): FAQ content data and FAQPage JSON-LD builder (#65)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Content data — use-case pages

**Files:**

- Create: `packages/web/src/content/useCases.ts`
- Test: `packages/web/src/content/useCases.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { useCases, useCaseList } from "./useCases";

describe("useCases content", () => {
  test("has the three expected use cases with unique slugs", () => {
    expect(useCaseList).toHaveLength(3);
    const slugs = useCaseList.map((u) => u.slug);
    expect(new Set(slugs).size).toBe(3);
    expect(slugs).toEqual(
      expect.arrayContaining(["notes-app", "task-manager", "reminders"]),
    );
  });

  test("every use case has complete, non-empty content", () => {
    for (const u of useCaseList) {
      expect(u.seoTitle.trim().length).toBeGreaterThan(0);
      expect(u.seoDescription.trim().length).toBeGreaterThan(0);
      expect(u.h1.trim().length).toBeGreaterThan(0);
      expect(u.intro.trim().length).toBeGreaterThan(0);
      expect(u.sections.length).toBeGreaterThanOrEqual(2);
      expect(u.ctaLabel.trim().length).toBeGreaterThan(0);
      for (const s of u.sections) {
        expect(s.h2.trim().length).toBeGreaterThan(0);
        expect(s.body.trim().length).toBeGreaterThan(0);
      }
    }
  });

  test("useCases map is keyed by slug", () => {
    expect(useCases["notes-app"].slug).toBe("notes-app");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace=packages/web -- src/content/useCases.test.ts`
Expected: FAIL — cannot resolve `./useCases`.

- [ ] **Step 3: Write the implementation**

```ts
export interface UseCaseSection {
  h2: string;
  body: string;
}

export interface UseCase {
  slug: string;
  seoTitle: string;
  seoDescription: string;
  h1: string;
  intro: string;
  sections: UseCaseSection[];
  ctaLabel: string;
}

export const useCaseList: UseCase[] = [
  {
    slug: "notes-app",
    seoTitle: "Note-Taking App — Keep Every Idea in One Place | Notes World",
    seoDescription:
      "Notes World is a fast, tag-based note-taking app. Capture ideas in seconds, organise them with colored tags, and find any note instantly. Free to start.",
    h1: "A note-taking app that keeps every idea in one place",
    intro:
      "Notes World is a clean, fast note-taking app for people who think in fragments. Jot something down in seconds, tag it, and trust that you can find it again — no folders to fuss over, no clutter to wade through.",
    sections: [
      {
        h2: "Capture notes the moment they happen",
        body: "Quick capture means a thought goes from your head into Notes World in a couple of keystrokes. There is nothing to set up first — start typing and it is saved.",
      },
      {
        h2: "Organise with tags, not folders",
        body: "Give each note one or more colored tags. Filter by a tag to see just your work notes, just your reading list, or whatever slice you need right now.",
      },
      {
        h2: "Find anything in seconds",
        body: "Everything you have ever written lives in one searchable place. Combined with tags, that means the note you half-remember is always a quick filter away.",
      },
    ],
    ctaLabel: "Start taking notes",
  },
  {
    slug: "task-manager",
    seoTitle: "Task Manager — Track To-Dos Alongside Your Notes | Notes World",
    seoDescription:
      "Manage tasks where your notes already live. Notes World lets you turn ideas into to-dos, tag them, and keep everything you are working on in one view. Free to start.",
    h1: "A task manager that lives next to your notes",
    intro:
      "Most to-dos start life as a note. Notes World keeps tasks and notes in the same place, so the idea you captured this morning becomes the task you finish this afternoon — without copying anything between apps.",
    sections: [
      {
        h2: "Turn ideas into tasks",
        body: "Anything you capture can become a task. Your notes and your to-dos stay together instead of scattered across separate tools.",
      },
      {
        h2: "Tag and filter your work",
        body: "Tag tasks the same way you tag notes. Pull up everything tagged 'urgent', or everything for a given project, in one click.",
      },
      {
        h2: "See what is in front of you",
        body: "A focused task view shows what is open so you can act on it, while the rest of your notes stay one filter away.",
      },
    ],
    ctaLabel: "Start managing tasks",
  },
  {
    slug: "reminders",
    seoTitle: "Reminders App — Never Lose a Follow-Up | Notes World",
    seoDescription:
      "Set reminders on the notes and tasks that matter. Notes World keeps your follow-ups with the context they belong to, on web and mobile. Free to start.",
    h1: "A reminders app that keeps the context",
    intro:
      "A reminder with no context is just a nag. Notes World attaches reminders to the note or task they belong to, so when one surfaces you already know exactly what it is about and what to do next.",
    sections: [
      {
        h2: "Reminders attached to real context",
        body: "Set a reminder on the actual note or task, not on a bare line of text. When it fires, the full context comes with it.",
      },
      {
        h2: "On your phone and your desktop",
        body: "With the web app and the mobile app sharing one account, your reminders follow you between devices.",
      },
      {
        h2: "Part of the same system",
        body: "Reminders are not a separate silo. They live alongside the notes and tasks you already keep, so nothing falls through the cracks.",
      },
    ],
    ctaLabel: "Start setting reminders",
  },
];

export const useCases: Record<string, UseCase> = Object.fromEntries(
  useCaseList.map((u) => [u.slug, u]),
);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test --workspace=packages/web -- src/content/useCases.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/content/useCases.ts packages/web/src/content/useCases.test.ts
git commit -m "feat(seo): use-case page content data (#65)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: MarketingLayout component

**Files:**

- Create: `packages/web/src/components/MarketingLayout.tsx`
- Test: `packages/web/src/components/MarketingLayout.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { MarketingLayout } from "./MarketingLayout";

function renderLayout() {
  return render(
    <MemoryRouter>
      <MarketingLayout>
        <main>
          <h1>Child content</h1>
        </main>
      </MarketingLayout>
    </MemoryRouter>,
  );
}

describe("MarketingLayout", () => {
  test("renders children, a home link, and a get-started link", () => {
    renderLayout();
    expect(screen.getByText("Child content")).toBeInTheDocument();
    // logo links home
    expect(screen.getByRole("link", { name: /notes-world/i })).toHaveAttribute(
      "href",
      "/",
    );
    // at least one link points to the login/get-started route
    const loginLinks = screen
      .getAllByRole("link")
      .filter((a) => a.getAttribute("href") === "/login");
    expect(loginLinks.length).toBeGreaterThanOrEqual(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace=packages/web -- src/components/MarketingLayout.test.tsx`
Expected: FAIL — cannot resolve `./MarketingLayout`.

- [ ] **Step 3: Write the implementation**

```tsx
import { ReactNode } from "react";
import { Link } from "react-router-dom";

/**
 * Shared chrome (nav + footer) for the public marketing/content pages
 * (use-case pages, FAQ). English-only and intentionally simpler than the
 * landing page nav — no language switcher or pricing anchors. The landing
 * page keeps its own nav and is not refactored onto this layout.
 */
export function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0f0f0f] text-[#f0f0f0] font-sans flex flex-col">
      <nav className="flex items-center justify-between px-8 py-4 border-b border-[#2a2a2a] sticky top-0 bg-[#0f0f0f]/90 backdrop-blur z-10">
        <Link
          to="/"
          className="flex items-center gap-2 font-bold text-sm tracking-wide"
        >
          <div className="w-6 h-6 rounded bg-accent flex items-center justify-center text-white text-xs font-extrabold">
            N
          </div>
          notes-world
        </Link>
        <div className="flex items-center gap-4">
          <Link
            to="/login"
            className="text-sm text-[#888] border border-[#2a2a2a] px-4 py-1.5 rounded-lg hover:text-white hover:border-[#444] transition-colors"
          >
            Sign in
          </Link>
          <Link
            to="/login"
            className="text-sm font-semibold bg-accent text-white px-4 py-1.5 rounded-lg hover:opacity-90 transition-opacity"
          >
            Get started
          </Link>
        </div>
      </nav>

      <div className="flex-1">{children}</div>

      <footer className="border-t border-[#2a2a2a] py-8 text-center text-xs text-[#555]">
        <p>
          &copy; 2026 Notes World &mdash;{" "}
          <Link
            to="/"
            className="text-[#888] hover:text-white transition-colors"
          >
            Home
          </Link>{" "}
          &middot;{" "}
          <Link
            to="/docs"
            className="text-[#888] hover:text-white transition-colors"
          >
            Docs
          </Link>{" "}
          &middot;{" "}
          <Link
            to="/faq"
            className="text-[#888] hover:text-white transition-colors"
          >
            FAQ
          </Link>{" "}
          &middot;{" "}
          <Link
            to="/privacy"
            className="text-[#888] hover:text-white transition-colors"
          >
            Privacy
          </Link>{" "}
          &middot;{" "}
          <Link
            to="/terms"
            className="text-[#888] hover:text-white transition-colors"
          >
            Terms
          </Link>
        </p>
      </footer>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test --workspace=packages/web -- src/components/MarketingLayout.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/components/MarketingLayout.tsx packages/web/src/components/MarketingLayout.test.tsx
git commit -m "feat(seo): MarketingLayout chrome for content pages (#65)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: UseCasePage component

**Files:**

- Create: `packages/web/src/pages/UseCasePage.tsx`
- Test: `packages/web/src/pages/UseCasePage.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { UseCasePage } from "./UseCasePage";
import { useCases } from "../content/useCases";

function renderPage(slug: string) {
  return render(
    <HelmetProvider>
      <MemoryRouter>
        <UseCasePage useCase={useCases[slug]} />
      </MemoryRouter>
    </HelmetProvider>,
  );
}

describe("UseCasePage", () => {
  test("renders exactly one h1 with the use case heading", () => {
    renderPage("notes-app");
    const h1s = screen.getAllByRole("heading", { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent(useCases["notes-app"].h1);
  });

  test("renders an h2 for every section", () => {
    renderPage("task-manager");
    const h2s = screen.getAllByRole("heading", { level: 2 });
    expect(h2s.length).toBe(useCases["task-manager"].sections.length);
  });

  test("sets the document title from the use case seoTitle", async () => {
    renderPage("reminders");
    await waitFor(() =>
      expect(document.title).toBe(useCases["reminders"].seoTitle),
    );
  });

  test("links to the other use cases and the FAQ", () => {
    renderPage("notes-app");
    const hrefs = screen
      .getAllByRole("link")
      .map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual(
      expect.arrayContaining(["/task-manager", "/reminders", "/faq"]),
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace=packages/web -- src/pages/UseCasePage.test.tsx`
Expected: FAIL — cannot resolve `./UseCasePage`.

- [ ] **Step 3: Write the implementation**

```tsx
import { Link } from "react-router-dom";
import { Seo } from "../components/Seo";
import { MarketingLayout } from "../components/MarketingLayout";
import { UseCase, useCaseList } from "../content/useCases";

export function UseCasePage({ useCase }: { useCase: UseCase }) {
  const others = useCaseList.filter((u) => u.slug !== useCase.slug);
  return (
    <MarketingLayout>
      <Seo
        title={useCase.seoTitle}
        description={useCase.seoDescription}
        path={`/${useCase.slug}`}
      />
      <main className="max-w-2xl mx-auto px-6 pt-16 pb-20">
        <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight tracking-tight mb-5">
          {useCase.h1}
        </h1>
        <p className="text-lg text-[#888] mb-12">{useCase.intro}</p>

        {useCase.sections.map((s) => (
          <section key={s.h2} className="mb-10">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-2">
              {s.h2}
            </h2>
            <p className="text-[#888] leading-relaxed">{s.body}</p>
          </section>
        ))}

        <Link
          to="/login"
          className="inline-block bg-accent text-white font-semibold px-7 py-2.5 rounded-lg hover:opacity-90 transition-opacity"
        >
          {useCase.ctaLabel}
        </Link>

        <nav className="mt-16 pt-8 border-t border-[#2a2a2a]">
          <p className="text-xs font-bold uppercase tracking-widest text-[#555] mb-3">
            Explore more
          </p>
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {others.map((u) => (
              <li key={u.slug}>
                <Link to={`/${u.slug}`} className="text-accent hover:underline">
                  {u.h1}
                </Link>
              </li>
            ))}
            <li>
              <Link to="/faq" className="text-accent hover:underline">
                Frequently asked questions
              </Link>
            </li>
          </ul>
        </nav>
      </main>
    </MarketingLayout>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test --workspace=packages/web -- src/pages/UseCasePage.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/pages/UseCasePage.tsx packages/web/src/pages/UseCasePage.test.tsx
git commit -m "feat(seo): data-driven UseCasePage component (#65)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: FaqPage component

**Files:**

- Create: `packages/web/src/pages/FaqPage.tsx`
- Test: `packages/web/src/pages/FaqPage.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { FaqPage } from "./FaqPage";
import { faqs } from "../content/faqs";

function renderFaq() {
  return render(
    <HelmetProvider>
      <MemoryRouter>
        <FaqPage />
      </MemoryRouter>
    </HelmetProvider>,
  );
}

describe("FaqPage", () => {
  test("renders exactly one h1", () => {
    renderFaq();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });

  test("renders every question as visible text", () => {
    renderFaq();
    for (const f of faqs) {
      expect(screen.getByText(f.q)).toBeInTheDocument();
    }
  });

  test("injects FAQPage JSON-LD into the document head", async () => {
    renderFaq();
    await waitFor(() => {
      const script = document.head.querySelector(
        'script[type="application/ld+json"]',
      );
      expect(script).not.toBeNull();
      const data = JSON.parse(script!.textContent || "{}");
      expect(data["@type"]).toBe("FAQPage");
      expect(data.mainEntity).toHaveLength(faqs.length);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace=packages/web -- src/pages/FaqPage.test.tsx`
Expected: FAIL — cannot resolve `./FaqPage`.

- [ ] **Step 3: Write the implementation**

```tsx
import { Helmet } from "react-helmet-async";
import { Seo } from "../components/Seo";
import { MarketingLayout } from "../components/MarketingLayout";
import { faqs, buildFaqLd } from "../content/faqs";

export function FaqPage() {
  return (
    <MarketingLayout>
      <Seo
        title="FAQ — Common Questions About Notes World"
        description="Answers to common questions about Notes World: pricing, the mobile app, importing notes, privacy, tags, and AI access."
        path="/faq"
      />
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify(buildFaqLd())}
        </script>
      </Helmet>
      <main className="max-w-2xl mx-auto px-6 pt-16 pb-20">
        <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight tracking-tight mb-12">
          Frequently asked questions
        </h1>
        <dl>
          {faqs.map((f) => (
            <div key={f.q} className="mb-8">
              <dt className="text-lg font-bold mb-1.5">
                <h2 className="text-lg font-bold">{f.q}</h2>
              </dt>
              <dd className="text-[#888] leading-relaxed">{f.a}</dd>
            </div>
          ))}
        </dl>
      </main>
    </MarketingLayout>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test --workspace=packages/web -- src/pages/FaqPage.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/pages/FaqPage.tsx packages/web/src/pages/FaqPage.test.tsx
git commit -m "feat(seo): FAQ page with FAQPage JSON-LD (#65)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: Wire routes in App.tsx

**Files:**

- Modify: `packages/web/src/App.tsx`
- Test: `packages/web/src/App.seo-routes.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import App from "./App";

function renderAt(path: string) {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </HelmetProvider>,
  );
}

describe("SEO content routes", () => {
  test.each([
    ["/notes-app", "A note-taking app that keeps every idea in one place"],
    ["/task-manager", "A task manager that lives next to your notes"],
    ["/reminders", "A reminders app that keeps the context"],
    ["/faq", "Frequently asked questions"],
  ])("%s renders its h1", async (path, heading) => {
    renderAt(path);
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { level: 1, name: heading }),
      ).toBeInTheDocument(),
    );
  });
});
```

Note: `App` is the default export and renders `AuthProvider` + `Routes`. It does not mount its own router, so wrapping in `MemoryRouter` here is correct. If `AuthProvider` performs network calls on mount that break the render, mock `../api` the same way existing tests do (see `src/components/BugReportButton.test.tsx`); add the mock only if the test errors.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace=packages/web -- src/App.seo-routes.test.tsx`
Expected: FAIL — routes redirect to `/` via the `*` catch-all, so the headings are not found.

- [ ] **Step 3: Add the imports and routes**

In `packages/web/src/App.tsx`, add these imports next to the other page imports (after the `DocsPage` import):

```tsx
import { UseCasePage } from "./pages/UseCasePage";
import { FaqPage } from "./pages/FaqPage";
import { useCases } from "./content/useCases";
```

Add these routes immediately **above** the `<Route path="*" ... />` catch-all:

```tsx
        <Route
          path="/notes-app"
          element={<UseCasePage useCase={useCases["notes-app"]} />}
        />
        <Route
          path="/task-manager"
          element={<UseCasePage useCase={useCases["task-manager"]} />}
        />
        <Route
          path="/reminders"
          element={<UseCasePage useCase={useCases["reminders"]} />}
        />
        <Route path="/faq" element={<FaqPage />} />
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test --workspace=packages/web -- src/App.seo-routes.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/App.tsx packages/web/src/App.seo-routes.test.tsx
git commit -m "feat(seo): wire /notes-app, /task-manager, /reminders, /faq routes (#65)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 7: Sitemap entries + landing-page footer links

**Files:**

- Modify: `packages/web/public/sitemap.xml`
- Modify: `packages/web/src/pages/LandingPage.tsx`

No new test — the sitemap is a static asset and the footer change is presentational. Coverage is verified by the existing route test in Task 6 and the full suite in Task 8.

- [ ] **Step 1: Add the four URLs to the sitemap**

In `packages/web/public/sitemap.xml`, add these entries before the closing `</urlset>` tag:

```xml
  <url>
    <loc>https://notes-world.christopherrehm.de/notes-app</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>https://notes-world.christopherrehm.de/task-manager</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>https://notes-world.christopherrehm.de/reminders</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>https://notes-world.christopherrehm.de/faq</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
```

- [ ] **Step 2: Add a "Use cases" link row to the landing footer**

In `packages/web/src/pages/LandingPage.tsx`, inside the `<footer>` element, immediately **after** the existing `<p>...</p>` that holds the copyright/links line, add a second paragraph:

```tsx
<p className="mt-3">
  <Link
    to="/notes-app"
    className="text-[#888] hover:text-white transition-colors"
  >
    Note-taking app
  </Link>{" "}
  &middot;{" "}
  <Link
    to="/task-manager"
    className="text-[#888] hover:text-white transition-colors"
  >
    Task manager
  </Link>{" "}
  &middot;{" "}
  <Link
    to="/reminders"
    className="text-[#888] hover:text-white transition-colors"
  >
    Reminders app
  </Link>{" "}
  &middot;{" "}
  <Link to="/faq" className="text-[#888] hover:text-white transition-colors">
    FAQ
  </Link>
</p>
```

(`Link` is already imported in `LandingPage.tsx`.)

- [ ] **Step 3: Build to verify nothing is broken**

Run: `npm run build --workspace=packages/web`
Expected: build succeeds with no type errors.

- [ ] **Step 4: Commit**

```bash
git add packages/web/public/sitemap.xml packages/web/src/pages/LandingPage.tsx
git commit -m "feat(seo): add content pages to sitemap and landing footer (#65)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 8: Full suite, follow-up issue, close-out

**Files:** none (verification + tracking).

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: all tests pass, including the new content/page/route tests.

- [ ] **Step 2: File the deferred blog/guides follow-up issue**

```bash
gh issue create \
  --title "SEO: add a blog/guides section for ongoing content" \
  --label "enhancement,seo" \
  --body "Deferred from #65. Add a short blog or guides section (e.g. \"how to organise notes with tags\", \"capturing ideas fast\") for ongoing indexable content. Each article a real route with unique Seo meta, added to sitemap.xml. Iterate topics from real Search Console query data."
```

- [ ] **Step 3: Reference the new issue number on #65** (use the number printed by Step 2)

```bash
gh issue comment 65 --body "Use-case pages (/notes-app, /task-manager, /reminders) and /faq with FAQPage JSON-LD shipped. Blog/guides deferred to #<NEW_ISSUE_NUMBER>."
```

---

## Self-Review

**Spec coverage:**

- Use-case pages with unique `Seo` meta → Tasks 2, 4, 6. ✓
- FAQ page with `FAQPage` JSON-LD → Tasks 1, 5, 6. ✓
- Every new route in `sitemap.xml` → Task 7. ✓
- Single h1 + descriptive h2s → enforced by tests in Tasks 4, 5, 6. ✓
- Internal linking → Task 4 (cross-links) + Task 7 (footer). ✓
- Blog deferred + follow-up issue → Task 8. ✓
- English-only, landing page untouched except footer → honored throughout. ✓
- Image alt text → no images added; rule documented in spec (no task needed). ✓

**Placeholder scan:** No TBDs. The only literal placeholder is `<NEW_ISSUE_NUMBER>` in Task 8 Step 3, which is intentionally filled from Step 2's output at runtime.

**Type consistency:** `UseCase`, `UseCaseSection`, `useCases` (map), `useCaseList` (array), `Faq`, `faqs`, `buildFaqLd()` are defined in Tasks 1–2 and used consistently in Tasks 4–6. `MarketingLayout` takes `{ children }`. `Seo` props (`title`, `description`, `path`) match the existing component.
