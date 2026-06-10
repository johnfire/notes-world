import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { GuidePage } from "./GuidePage";
import { guides } from "../content/guides";

function renderGuide(slug: string) {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[`/guides/${slug}`]}>
        <Routes>
          <Route path="/guides" element={<div>guides-index-marker</div>} />
          <Route path="/guides/:slug" element={<GuidePage />} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  );
}

describe("GuidePage", () => {
  test("renders exactly one h1 with the guide heading", () => {
    renderGuide("organise-notes-with-tags");
    const h1s = screen.getAllByRole("heading", { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent(guides["organise-notes-with-tags"].h1);
  });

  test("renders an h2 for every section", () => {
    const guide = guides["capture-ideas-fast"];
    renderGuide(guide.slug);
    const h2s = screen.getAllByRole("heading", { level: 2 });
    expect(h2s.length).toBe(guide.sections.length);
  });

  test("sets the document title from the guide seoTitle", async () => {
    const guide = guides["use-ai-with-your-notes"];
    renderGuide(guide.slug);
    await waitFor(() => expect(document.title).toBe(guide.seoTitle));
  });

  test("redirects unknown slugs to the guides index", () => {
    renderGuide("no-such-guide");
    expect(screen.getByText("guides-index-marker")).toBeInTheDocument();
  });
});
