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
