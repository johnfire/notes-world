import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";
import { useAuth } from "../context/AuthContext";
import { billing, apiKeys } from "../api";
import type { ApiKey } from "../api";
import { UpgradePage } from "./UpgradePage";
import { LANGUAGES } from "../i18n/languages";
import { useTooltips } from "../hooks/useTooltips";
import { useOnboardingTour } from "../hooks/useOnboardingTour";
import { ChangelogPage } from "./ChangelogPage";

interface FormState {
  loading: boolean;
  error: string;
  success: string;
}

const blank: FormState = { loading: false, error: "", success: "" };

export function AccountPage({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const { user, logout, changeEmail, changePassword, deleteAccount } =
    useAuth();
  const tooltips = useTooltips();
  const tour = useOnboardingTour();
  const [changelogOpen, setChangelogOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  const [emailForm, setEmailForm] = useState({ email: "", password: "" });
  const [emailState, setEmailState] = useState<FormState>(blank);

  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [pwState, setPwState] = useState<FormState>(blank);

  const [deletePassword, setDeletePassword] = useState("");
  const [deleteState, setDeleteState] = useState<FormState>(blank);

  async function handleChangeEmail(e: React.FormEvent) {
    e.preventDefault();
    setEmailState({ loading: true, error: "", success: "" });
    try {
      await changeEmail(emailForm.email.trim(), emailForm.password);
      setEmailForm({ email: "", password: "" });
      setEmailState({
        loading: false,
        error: "",
        success: t("app.account.emailUpdated"),
      });
    } catch (err: unknown) {
      setEmailState({
        loading: false,
        error: err instanceof Error ? err.message : t("app.account.failed"),
        success: "",
      });
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (pwForm.next !== pwForm.confirm) {
      setPwState({
        loading: false,
        error: t("app.account.passwordMismatch"),
        success: "",
      });
      return;
    }
    setPwState({ loading: true, error: "", success: "" });
    try {
      await changePassword(pwForm.current, pwForm.next);
      setPwForm({ current: "", next: "", confirm: "" });
      setPwState({
        loading: false,
        error: "",
        success: t("app.account.passwordUpdated"),
      });
    } catch (err: unknown) {
      setPwState({
        loading: false,
        error: err instanceof Error ? err.message : t("app.account.failed"),
        success: "",
      });
    }
  }

  async function handleDeleteAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!window.confirm(t("app.account.deleteConfirm"))) return;
    setDeleteState({ loading: true, error: "", success: "" });
    try {
      await deleteAccount(deletePassword);
    } catch (err: unknown) {
      setDeleteState({
        loading: false,
        error: err instanceof Error ? err.message : t("app.account.failed"),
        success: "",
      });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-surface-800 border border-surface-500 rounded-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-surface-500">
          <h2 className="text-white font-semibold text-base">
            {t("app.account.title")}
          </h2>
          <button
            onClick={onClose}
            className="btn-ghost text-gray-400 hover:text-white p-1"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-gray-400 text-sm">
              {t("app.account.signedInAs")}{" "}
              <span className="text-gray-200">{user?.email}</span>
            </p>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-surface-700 text-gray-300">
              {t(`app.account.roles.${user?.role ?? "free"}`)}
            </span>
          </div>

          {user?.role === "free" && (
            <div className="bg-accent/10 border border-accent/20 rounded-lg p-3 flex items-center justify-between">
              <p className="text-sm text-gray-300">
                {t("app.account.freePlanLimit")}
              </p>
              <button
                className="text-xs font-medium text-accent hover:underline shrink-0 ml-3"
                onClick={() => setUpgradeOpen(true)}
              >
                {t("app.account.upgrade")}
              </button>
            </div>
          )}

          {user?.role === "paid" && (
            <div className="bg-green-400/10 border border-green-400/20 rounded-lg p-3 flex items-center justify-between">
              <p className="text-sm text-gray-300">
                {t("app.account.proPlan")}
                {user.stripe_subscription_status
                  ? ` · ${user.stripe_subscription_status}`
                  : ""}
              </p>
              <button
                className="text-xs font-medium text-green-400 hover:underline shrink-0 ml-3"
                disabled={portalLoading}
                onClick={async () => {
                  setPortalLoading(true);
                  const { url } = await billing.portal();
                  window.location.href = url;
                }}
              >
                {portalLoading
                  ? t("app.account.loadingPortal")
                  : t("app.account.manageBilling")}
              </button>
            </div>
          )}

          {upgradeOpen && <UpgradePage onClose={() => setUpgradeOpen(false)} />}

          {/* Preferences */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
              {t("app.account.preferences")}
            </h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-200">
                  {t("app.account.tooltipsToggle")}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {t("app.account.tooltipsDesc")}
                </p>
              </div>
              <button
                onClick={tooltips.toggle}
                className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ml-4 ${tooltips.enabled ? "bg-accent" : "bg-surface-600"}`}
                aria-pressed={tooltips.enabled}
              >
                <span
                  className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${tooltips.enabled ? "translate-x-5" : "translate-x-0.5"}`}
                />
              </button>
            </div>
            <div className="flex items-center justify-between mt-4">
              <div>
                <p className="text-sm text-gray-200">App tour</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Replay the new-user walkthrough
                </p>
              </div>
              <button
                onClick={() => {
                  tour.restart();
                  onClose();
                }}
                className="btn-ghost text-xs border border-surface-400 px-3 py-1.5 shrink-0 ml-4"
              >
                Restart tour
              </button>
            </div>
            <div className="flex items-center justify-between mt-4">
              <div>
                <p className="text-sm text-gray-200">What's new</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Recent updates and changes
                </p>
              </div>
              <button
                onClick={() => setChangelogOpen(true)}
                className="btn-ghost text-xs border border-surface-400 px-3 py-1.5 shrink-0 ml-4"
              >
                View changelog
              </button>
            </div>
          </section>

          {changelogOpen && (
            <ChangelogPage onClose={() => setChangelogOpen(false)} />
          )}

          {/* Language */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
              {t("app.account.language")}
            </h3>
            <select
              value={i18n.resolvedLanguage}
              onChange={(e) => void i18n.changeLanguage(e.target.value)}
              className="input text-sm w-full"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.label}
                </option>
              ))}
            </select>
          </section>

          {/* Change email */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
              {t("app.account.changeEmail")}
            </h3>
            <form onSubmit={handleChangeEmail} className="space-y-2">
              <input
                className="input w-full"
                type="email"
                placeholder={t("app.account.newEmail")}
                value={emailForm.email}
                onChange={(e) =>
                  setEmailForm((f) => ({ ...f, email: e.target.value }))
                }
                required
              />
              <input
                className="input w-full"
                type="password"
                placeholder={t("app.account.currentPassword")}
                value={emailForm.password}
                onChange={(e) =>
                  setEmailForm((f) => ({ ...f, password: e.target.value }))
                }
                required
              />
              {emailState.error && (
                <p className="text-danger text-xs">{emailState.error}</p>
              )}
              {emailState.success && (
                <p className="text-green-400 text-xs">{emailState.success}</p>
              )}
              <button
                className="btn-primary text-sm w-full"
                disabled={emailState.loading}
              >
                {emailState.loading
                  ? t("app.account.saving")
                  : t("app.account.updateEmail")}
              </button>
            </form>
          </section>

          {/* Change password */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
              {t("app.account.changePassword")}
            </h3>
            <form onSubmit={handleChangePassword} className="space-y-2">
              <input
                className="input w-full"
                type="password"
                placeholder={t("app.account.currentPassword")}
                value={pwForm.current}
                onChange={(e) =>
                  setPwForm((f) => ({ ...f, current: e.target.value }))
                }
                required
              />
              <input
                className="input w-full"
                type="password"
                placeholder={t("app.account.newPassword")}
                value={pwForm.next}
                onChange={(e) =>
                  setPwForm((f) => ({ ...f, next: e.target.value }))
                }
                required
              />
              <input
                className="input w-full"
                type="password"
                placeholder={t("app.account.confirmPassword")}
                value={pwForm.confirm}
                onChange={(e) =>
                  setPwForm((f) => ({ ...f, confirm: e.target.value }))
                }
                required
              />
              {pwState.error && (
                <p className="text-danger text-xs">{pwState.error}</p>
              )}
              {pwState.success && (
                <p className="text-green-400 text-xs">{pwState.success}</p>
              )}
              <button
                className="btn-primary text-sm w-full"
                disabled={pwState.loading}
              >
                {pwState.loading
                  ? t("app.account.saving")
                  : t("app.account.updatePassword")}
              </button>
            </form>
          </section>

          {/* Android app */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
              Android App
            </h3>
            <div className="bg-surface-700 rounded-lg p-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-gray-200">Notes World for Android</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  v0.1.0 · Sideload APK
                </p>
              </div>
              <a
                href="/downloads/notes-world-0.1.0.apk"
                download
                className="btn-primary text-xs px-3 py-1.5 shrink-0"
              >
                Download APK
              </a>
            </div>
          </section>

          {/* API Keys */}
          <ApiKeysSection />

          {/* Sign out */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
              {t("app.account.session")}
            </h3>
            <button
              className="btn-ghost text-sm w-full border border-surface-400 py-2"
              onClick={() => logout()}
            >
              {t("app.account.signOut")}
            </button>
          </section>

          {/* Delete account */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-red-500 mb-3">
              {t("app.account.dangerZone")}
            </h3>
            <form onSubmit={handleDeleteAccount} className="space-y-2">
              <input
                className="input w-full"
                type="password"
                placeholder={t("app.account.confirmPasswordPlaceholder")}
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                required
              />
              {deleteState.error && (
                <p className="text-danger text-xs">{deleteState.error}</p>
              )}
              <button
                className="w-full py-2 rounded-md text-sm font-medium border border-red-600 text-red-400 hover:bg-red-900/20 transition-colors"
                disabled={deleteState.loading}
              >
                {deleteState.loading
                  ? t("app.account.deleting")
                  : t("app.account.deleteAccount")}
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}

function ApiKeysSection() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [revealed, setRevealed] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    apiKeys
      .list()
      .then(setKeys)
      .catch(() => setError("Failed to load API keys"))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate() {
    setError("");
    setCreating(true);
    try {
      const result = await apiKeys.create(newKeyName || undefined);
      setKeys((prev) => [result, ...prev]);
      setNewKeyName("");
      setRevealed(result.key);
      setCopied(false);
    } catch {
      setError("Failed to create API key");
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(prefix: string) {
    if (!window.confirm(`Revoke API key ${prefix}…?`)) return;
    try {
      await apiKeys.revoke(prefix);
      setKeys((prev) => prev.filter((k) => k.key_prefix !== prefix));
      if (revealed) setRevealed(null);
    } catch {
      setError("Failed to revoke API key");
    }
  }

  function copyKey() {
    if (!revealed) return;
    void navigator.clipboard.writeText(revealed);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
        API Keys
      </h3>

      {revealed && (
        <div className="mb-3 p-3 bg-yellow-400/10 border border-yellow-400/30 rounded-lg space-y-2">
          <p className="text-yellow-400 text-xs font-semibold">
            Copy this key now — it will not be shown again.
          </p>
          <div className="flex gap-2">
            <code className="flex-1 bg-surface-700 text-gray-200 text-xs px-2 py-1.5 rounded font-mono break-all">
              {revealed}
            </code>
            <button
              className="shrink-0 text-xs px-3 py-1 border border-surface-400 rounded hover:border-accent transition-colors"
              onClick={copyKey}
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <button
            className="text-gray-500 text-xs hover:text-gray-300"
            onClick={() => setRevealed(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="flex gap-2 mb-3">
        <input
          className="input text-sm flex-1"
          placeholder="Key name (e.g. Claude Code)"
          value={newKeyName}
          onChange={(e) => setNewKeyName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void handleCreate()}
        />
        <button
          className="btn-primary text-sm px-4 shrink-0"
          onClick={() => void handleCreate()}
          disabled={creating}
        >
          {creating ? "…" : "Generate"}
        </button>
      </div>

      {error && <p className="text-danger text-xs mb-2">{error}</p>}

      {loading ? (
        <div className="flex justify-center py-4">
          <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : keys.length === 0 ? (
        <p className="text-gray-600 text-xs">No API keys yet.</p>
      ) : (
        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-500 text-left">
              <th className="pb-1 font-medium">Prefix</th>
              <th className="pb-1 font-medium">Name</th>
              <th className="pb-1 font-medium">Created</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {keys.map((k) => (
              <tr key={k.key_prefix} className="border-t border-surface-600">
                <td className="py-1.5 font-mono text-gray-300 pr-3">
                  {k.key_prefix}…
                </td>
                <td className="py-1.5 text-gray-400 pr-3">{k.name}</td>
                <td className="py-1.5 text-gray-500 pr-3">
                  {new Date(k.created_at).toLocaleDateString()}
                </td>
                <td className="py-1.5">
                  <button
                    className="text-gray-600 hover:text-danger"
                    onClick={() => void handleRevoke(k.key_prefix)}
                  >
                    Revoke
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
