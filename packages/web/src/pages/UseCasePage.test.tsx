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
