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
