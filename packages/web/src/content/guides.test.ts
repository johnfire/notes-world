import { guideList, getGuide, buildGuideJsonLd } from "./guides";

const EXPECTED_SLUGS = [
  "organise-notes-with-tags",
  "capture-ideas-fast",
  "notes-tasks-reminders-one-app",
  "use-ai-with-your-notes",
];

describe("guides content", () => {
  test("has the four expected guides with unique, url-safe slugs", () => {
    expect(guideList).toHaveLength(4);
    const slugs = guideList.map((g) => g.slug);
    expect(new Set(slugs).size).toBe(4);
    expect(slugs).toEqual(expect.arrayContaining(EXPECTED_SLUGS));
    for (const slug of slugs) {
      expect(slug).toMatch(/^[a-z0-9-]+$/);
    }
  });

  test("every guide has complete, non-empty content", () => {
    for (const g of guideList) {
      expect(g.seoTitle.trim().length).toBeGreaterThan(0);
      expect(g.seoDescription.trim().length).toBeGreaterThan(0);
      expect(g.h1.trim().length).toBeGreaterThan(0);
      expect(g.intro.trim().length).toBeGreaterThan(0);
      expect(g.ctaLabel.trim().length).toBeGreaterThan(0);
      expect(g.datePublished).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(g.sections.length).toBeGreaterThanOrEqual(2);
      for (const s of g.sections) {
        expect(s.h2.trim().length).toBeGreaterThan(0);
        expect(s.body.trim().length).toBeGreaterThan(0);
      }
    }
  });

  test("getGuide returns the matching guide or undefined", () => {
    expect(getGuide("capture-ideas-fast")?.slug).toBe("capture-ideas-fast");
    expect(getGuide("does-not-exist")).toBeUndefined();
  });

  test("buildGuideJsonLd produces a schema.org Article", () => {
    const ld = buildGuideJsonLd(guideList[0]) as Record<string, unknown>;
    expect(ld["@context"]).toBe("https://schema.org");
    expect(ld["@type"]).toBe("Article");
    expect(ld.headline).toBe(guideList[0].h1);
    expect(ld.datePublished).toBe(guideList[0].datePublished);
    expect(ld.description).toBe(guideList[0].seoDescription);
  });
});
