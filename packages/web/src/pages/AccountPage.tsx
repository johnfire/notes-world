import { useState } from "react";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";
import { useAuth } from "../context/AuthContext";
import { billing } from "../api";
import { UpgradePage } from "./UpgradePage";
import { LANGUAGES } from "../i18n/languages";

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
