import { useState, FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";

export function LoginPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
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
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full bg-gray-800 text-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
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
