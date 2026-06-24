import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthProvider";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { PrivacyPolicyPage } from "./pages/PrivacyPolicyPage";
import { TermsOfServicePage } from "./pages/TermsOfServicePage";
import { DocsPage } from "./pages/DocsPage";
import { UseCasePage } from "./pages/UseCasePage";
import { FaqPage } from "./pages/FaqPage";
import { GuidesIndexPage } from "./pages/GuidesIndexPage";
import { GuidePage } from "./pages/GuidePage";
import { useCases } from "./content/useCases";

// The authenticated app (views, drawers, dashboard) is the bulk of the bundle
// but is useless to logged-out visitors and crawlers. Lazy-load it so the public
// pages — the ones that matter for first paint and SEO — stay lightweight.
const AppShell = lazy(() => import("./DashboardView"));

function AppLoading() {
  return (
    <div className="flex items-center justify-center h-screen bg-surface-800">
      <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/terms" element={<TermsOfServicePage />} />
        <Route path="/docs" element={<DocsPage />} />
        <Route
          path="/app/*"
          element={
            <ProtectedRoute>
              <Suspense fallback={<AppLoading />}>
                <AppShell />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/notes-app"
          element={<UseCasePage useCase={useCases["notes-app"]} />}
        />
        <Route
          path="/task-manager"
          element={<UseCasePage useCase={useCases["task-manager"]} />}
        />
        <Route
          path="/reminders"
          element={<UseCasePage useCase={useCases["reminders"]} />}
        />
        <Route path="/faq" element={<FaqPage />} />
        <Route path="/guides" element={<GuidesIndexPage />} />
        <Route path="/guides/:slug" element={<GuidePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
