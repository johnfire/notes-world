import { useState, FormEvent } from "react";
import { useNavigate, Link, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { Seo } from "../components/Seo";

export function LoginPage() {
  const { login, register, accessToken, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (mode === "register" && !agreed) {
      setError(t("login.mustAgree"));
      return;
    }
    setError(null);
    setLoading(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(email, password);
      }
      navigate("/app", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  // Already signed in (session restored from the refresh cookie) — skip the
  // login form and go straight to the app instead of asking to log in again.
  if (!authLoading && accessToken) return <Navigate to="/app" replace />;

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <Seo
        title="Sign in · Notes World"
        description="Sign in or create your free Notes World account to organise your notes, tasks, and reminders."
        path="/login"
      />
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold text-white mb-8 text-center">
          {t("login.title")}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              {t("login.email")}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-gray-800 text-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              {t("login.password")}
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full bg-gray-800 text-white rounded px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={
                  showPassword
                    ? t("login.hidePassword")
                    : t("login.showPassword")
                }
                className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-200 transition-colors"
              >
                {showPassword ? (
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {mode === "register" && (
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 shrink-0 accent-blue-500"
              />
              <span className="text-sm text-gray-400">
                {t("login.agreeStart")}
                <Link
                  to="/terms"
                  target="_blank"
                  className="text-blue-400 hover:underline"
                >
                  {t("login.termsLink")}
                </Link>
                {t("login.agreeMid")}
                <Link
                  to="/privacy"
                  target="_blank"
                  className="text-blue-400 hover:underline"
                >
                  {t("login.privacyLink")}
                </Link>
              </span>
            </label>
          )}

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded px-3 py-2 text-sm font-medium transition-colors"
          >
            {loading
              ? t("login.loading")
              : mode === "login"
                ? t("login.signIn")
                : t("login.createAccount")}
          </button>
        </form>

        <button
          onClick={() => {
            setMode((m) => (m === "login" ? "register" : "login"));
            setError(null);
            setAgreed(false);
          }}
          className="mt-4 w-full text-center text-sm text-gray-500 hover:text-gray-300 transition-colors"
        >
          {mode === "login" ? t("login.noAccount") : t("login.haveAccount")}
        </button>
      </div>
    </div>
  );
}
