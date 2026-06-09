import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import App from "./App";

// AuthProvider calls fetch('/api/auth/refresh') on mount. Node's undici rejects
// relative URLs, so we stub fetch to return 401 (handled gracefully — sets
// loading=false with no user).
beforeAll(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }),
  );
});
afterAll(() => {
  vi.unstubAllGlobals();
});

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
