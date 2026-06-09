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
  test("renders the footer navigation links", () => {
    renderLayout();
    const hrefs = screen
      .getAllByRole("link")
      .map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual(
      expect.arrayContaining(["/docs", "/faq", "/privacy", "/terms"]),
    );
    expect(screen.getByRole("link", { name: /sign in/i })).toHaveAttribute(
      "href",
      "/login",
    );
  });

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
