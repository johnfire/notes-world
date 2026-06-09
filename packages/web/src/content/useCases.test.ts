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
