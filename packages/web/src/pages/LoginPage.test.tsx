import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { vi } from "vitest";
import { LoginPage } from "./LoginPage";

// Drive the auth state per-test so we can assert the redirect-when-already-
// signed-in behavior (regression: a live session must not show the login form).
let mockAuth: {
  accessToken: string | null;
  loading: boolean;
  login: () => Promise<void>;
  register: () => Promise<void>;
};

vi.mock("../context/AuthContext", () => ({
  useAuth: () => mockAuth,
}));

function renderLogin(state: { accessToken: string | null; loading: boolean }) {
  mockAuth = { ...state, login: vi.fn(), register: vi.fn() };
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/app" element={<div>APP HOME</div>} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  );
}

describe("LoginPage auth-aware redirect", () => {
  test("redirects an already-authenticated user straight to /app", () => {
    renderLogin({ accessToken: "live-token", loading: false });
    expect(screen.getByText("APP HOME")).toBeInTheDocument();
    expect(document.querySelector('input[type="email"]')).toBeNull();
  });

  test("shows the login form when not authenticated", () => {
    const { container } = renderLogin({ accessToken: null, loading: false });
    expect(screen.queryByText("APP HOME")).not.toBeInTheDocument();
    expect(container.querySelector('input[type="email"]')).not.toBeNull();
  });

  test("does not redirect while the session is still being restored", () => {
    const { container } = renderLogin({ accessToken: "t", loading: true });
    expect(screen.queryByText("APP HOME")).not.toBeInTheDocument();
    expect(container.querySelector('input[type="email"]')).not.toBeNull();
  });
});
