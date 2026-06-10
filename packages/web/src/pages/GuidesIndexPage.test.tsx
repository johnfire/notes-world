import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { GuidesIndexPage } from "./GuidesIndexPage";
import { guideList } from "../content/guides";

function renderIndex() {
  return render(
    <HelmetProvider>
      <MemoryRouter>
        <GuidesIndexPage />
      </MemoryRouter>
    </HelmetProvider>,
  );
}

describe("GuidesIndexPage", () => {
  test("renders exactly one h1", () => {
    renderIndex();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });

  test("links to every guide", () => {
    renderIndex();
    const hrefs = screen
      .getAllByRole("link")
      .map((a) => a.getAttribute("href"));
    for (const g of guideList) {
      expect(hrefs).toEqual(expect.arrayContaining([`/guides/${g.slug}`]));
    }
  });

  test("has a contextual link to the full user guide at /docs", () => {
    renderIndex();
    const userGuideLink = screen.getByRole("link", { name: /user guide/i });
    expect(userGuideLink).toHaveAttribute("href", "/docs");
  });
});
