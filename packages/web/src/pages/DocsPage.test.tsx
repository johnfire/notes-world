import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { DocsPage } from "./DocsPage";

function renderDocs() {
  return render(
    <HelmetProvider>
      <MemoryRouter>
        <DocsPage />
      </MemoryRouter>
    </HelmetProvider>,
  );
}

describe("DocsPage", () => {
  test("renders exactly one h1", () => {
    renderDocs();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });

  test("documents the previously-missing features", () => {
    const { container } = renderDocs();
    expect(container.querySelector("#checklists")).not.toBeNull();
    expect(container.querySelector("#dividers")).not.toBeNull();
    expect(container.querySelector("#mobile-app")).not.toBeNull();
  });

  test("cross-links to the guides section", () => {
    renderDocs();
    const hrefs = screen
      .getAllByRole("link")
      .map((a) => a.getAttribute("href"));
    expect(hrefs).toContain("/guides");
  });
});
