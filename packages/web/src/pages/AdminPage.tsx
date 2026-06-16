import { useEffect, useState } from "react";
import { admin } from "../api";
import type { Coupon } from "../api";
import type { User, UserRole } from "../types";

const ROLES: UserRole[] = ["free", "gift", "paid", "admin"];

const ROLE_LABELS: Record<UserRole, string> = {
  free: "Free",
  gift: "Pro (gifted)",
  paid: "Pro",
  admin: "Admin",
};

const ROLE_COLORS: Record<UserRole, string> = {
  free: "text-gray-400",
  gift: "text-green-400",
  paid: "text-accent",
  admin: "text-yellow-400",
};

type Tab = "users" | "coupons";

export function AdminPage({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("users");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-surface-800 border border-surface-500 rounded-xl w-full max-w-3xl mx-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-surface-500 shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-white font-semibold text-base">Admin</h2>
            <div className="flex gap-1">
              {(["users", "coupons"] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`text-xs px-3 py-1 rounded-full transition-colors ${
                    tab === t
                      ? "bg-accent text-white"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>
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

        {tab === "users" ? <UsersTab /> : <CouponsTab />}
      </div>
    </div>
  );
}

const blankUserForm = { email: "", password: "", role: "free" as UserRole };

function UsersTab() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [form, setForm] = useState(blankUserForm);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  useEffect(() => {
    admin
      .listUsers()
      .then(setUsers)
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError("");
    setCreating(true);
    try {
      const created = await admin.createUser(form);
      setUsers((prev) => [created, ...prev]);
      setForm(blankUserForm);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setCreating(false);
    }
  }

  async function handleRoleChange(userId: string, role: UserRole) {
    setSaving(userId);
    try {
      const updated = await admin.setRole(userId, role);
      setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
    } finally {
      setSaving(null);
    }
  }

  async function handleToggleDisabled(user: User) {
    const disable = !user.disabled;
    if (
      disable &&
      !window.confirm(
        `Disable ${user.email}? They will be logged out and unable to sign in until re-enabled.`,
      )
    )
      return;
    setSaving(user.id);
    try {
      const updated = await admin.setDisabled(user.id, disable);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? updated : u)));
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setSaving(null);
    }
  }

  async function handleResetPassword(user: User) {
    const pw = window.prompt(
      `New password for ${user.email} (min 8 characters):`,
    );
    if (pw === null) return;
    if (pw.length < 8) {
      window.alert("Password must be at least 8 characters");
      return;
    }
    setSaving(user.id);
    try {
      await admin.resetPassword(user.id, pw);
      window.alert(
        `Password reset for ${user.email}. They have been logged out of all sessions.`,
      );
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Failed to reset");
    } finally {
      setSaving(null);
    }
  }

  const stats = {
    total: users.length,
    free: users.filter((u) => u.role === "free").length,
    gift: users.filter((u) => u.role === "gift").length,
    paid: users.filter((u) => u.role === "paid").length,
    admin: users.filter((u) => u.role === "admin").length,
  };

  return (
    <>
      <div className="p-4 border-b border-surface-500 shrink-0">
        <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">
          Create user
        </p>
        <form
          onSubmit={(e) => void handleCreate(e)}
          className="flex gap-2 flex-wrap"
        >
          <input
            className="input text-sm flex-1 min-w-48"
            placeholder="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            required
          />
          <input
            className="input text-sm w-36"
            placeholder="Password"
            type="text"
            value={form.password}
            onChange={(e) =>
              setForm((f) => ({ ...f, password: e.target.value }))
            }
            required
          />
          <select
            className="input text-sm w-24"
            value={form.role}
            onChange={(e) =>
              setForm((f) => ({ ...f, role: e.target.value as UserRole }))
            }
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
          <button className="btn-primary text-sm px-4" disabled={creating}>
            {creating ? "…" : "Create"}
          </button>
        </form>
        {createError && (
          <p className="text-danger text-xs mt-1">{createError}</p>
        )}
      </div>

      <div className="flex gap-6 px-4 py-3 border-b border-surface-500 text-xs text-gray-400 shrink-0">
        <span>
          Total: <strong className="text-white">{stats.total}</strong>
        </span>
        <span>
          Free: <strong className="text-gray-300">{stats.free}</strong>
        </span>
        <span>
          Pro: <strong className="text-accent">{stats.paid}</strong>
        </span>
        <span>
          Pro (gifted):{" "}
          <strong className="text-green-400">{stats.gift}</strong>
        </span>
        <span>
          Admin: <strong className="text-yellow-400">{stats.admin}</strong>
        </span>
      </div>

      <div className="overflow-y-auto flex-1">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-surface-800 border-b border-surface-500">
              <tr>
                <th className="text-left px-4 py-2 text-gray-500 font-medium">
                  Email
                </th>
                <th className="text-left px-4 py-2 text-gray-500 font-medium">
                  Role
                </th>
                <th className="text-left px-4 py-2 text-gray-500 font-medium">
                  Status
                </th>
                <th className="text-left px-4 py-2 text-gray-500 font-medium">
                  Joined
                </th>
                <th className="text-right px-4 py-2 text-gray-500 font-medium">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  key={user.id}
                  className={`border-b border-surface-600 hover:bg-surface-700 ${
                    user.disabled ? "opacity-50" : ""
                  }`}
                >
                  <td className="px-4 py-2 text-gray-200">{user.email}</td>
                  <td className="px-4 py-2">
                    <select
                      className={`bg-surface-700 border border-surface-500 rounded px-2 py-0.5 text-xs ${ROLE_COLORS[user.role]} focus:outline-none focus:border-accent`}
                      value={user.role}
                      disabled={saving === user.id}
                      onChange={(e) =>
                        handleRoleChange(user.id, e.target.value as UserRole)
                      }
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => void handleToggleDisabled(user)}
                      disabled={saving === user.id}
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        user.disabled
                          ? "bg-danger/10 text-danger"
                          : "bg-green-400/10 text-green-400"
                      }`}
                      title={user.disabled ? "Click to enable" : "Click to disable"}
                    >
                      {user.disabled ? "disabled" : "active"}
                    </button>
                  </td>
                  <td className="px-4 py-2 text-gray-500 text-xs">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => void handleResetPassword(user)}
                      disabled={saving === user.id}
                      className="text-gray-500 hover:text-accent text-xs"
                    >
                      Reset password
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

const blankForm = { code: "", stripe_coupon_id: "", description: "" };

function CouponsTab() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(blankForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    admin
      .listCoupons()
      .then(setCoupons)
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setSaving(true);
    try {
      const created = await admin.createCoupon(form);
      setCoupons((prev) => [created, ...prev]);
      setForm(blankForm);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(coupon: Coupon) {
    const updated = await admin.updateCoupon(coupon.code, {
      active: !coupon.active,
    });
    setCoupons((prev) =>
      prev.map((c) => (c.code === coupon.code ? updated : c)),
    );
  }

  async function handleDelete(code: string) {
    if (!window.confirm(`Delete coupon "${code}"?`)) return;
    await admin.deleteCoupon(code);
    setCoupons((prev) => prev.filter((c) => c.code !== code));
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Create form */}
      <div className="p-4 border-b border-surface-500 shrink-0">
        <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">
          New coupon
        </p>
        <form
          onSubmit={(e) => void handleCreate(e)}
          className="flex gap-2 flex-wrap"
        >
          <input
            className="input text-sm w-28"
            placeholder="Code"
            value={form.code}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                code: e.target.value.toLowerCase().trim(),
              }))
            }
            required
          />
          <input
            className="input text-sm flex-1 min-w-40"
            placeholder="Stripe coupon ID"
            value={form.stripe_coupon_id}
            onChange={(e) =>
              setForm((f) => ({ ...f, stripe_coupon_id: e.target.value }))
            }
            required
          />
          <input
            className="input text-sm flex-1 min-w-48"
            placeholder="Description shown to user"
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
            required
          />
          <button className="btn-primary text-sm px-4" disabled={saving}>
            {saving ? "…" : "Add"}
          </button>
        </form>
        {formError && <p className="text-danger text-xs mt-1">{formError}</p>}
        <p className="text-gray-600 text-xs mt-2">
          Create the coupon in the Stripe dashboard first, then paste its ID
          here. For onebukk: create a coupon with amount_off=400, currency=eur,
          duration=once.
        </p>
      </div>

      {/* List */}
      <div className="overflow-y-auto flex-1">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : coupons.length === 0 ? (
          <p className="text-gray-600 text-sm text-center py-8">
            No coupons yet
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-surface-800 border-b border-surface-500">
              <tr>
                <th className="text-left px-4 py-2 text-gray-500 font-medium">
                  Code
                </th>
                <th className="text-left px-4 py-2 text-gray-500 font-medium">
                  Stripe ID
                </th>
                <th className="text-left px-4 py-2 text-gray-500 font-medium">
                  Description
                </th>
                <th className="text-left px-4 py-2 text-gray-500 font-medium">
                  Active
                </th>
                <th />
              </tr>
            </thead>
            <tbody>
              {coupons.map((c) => (
                <tr
                  key={c.code}
                  className="border-b border-surface-600 hover:bg-surface-700"
                >
                  <td className="px-4 py-2 font-mono text-gray-200">
                    {c.code}
                  </td>
                  <td className="px-4 py-2 text-gray-500 text-xs font-mono">
                    {c.stripe_coupon_id || (
                      <span className="text-yellow-500">not set</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-gray-300">{c.description}</td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => void toggleActive(c)}
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        c.active
                          ? "bg-green-400/10 text-green-400"
                          : "bg-surface-600 text-gray-500"
                      }`}
                    >
                      {c.active ? "active" : "off"}
                    </button>
                  </td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => void handleDelete(c.code)}
                      className="text-gray-600 hover:text-danger text-xs"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
