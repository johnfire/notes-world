import { useEffect, useState } from "react";
import { admin } from "../api";
import type { User, UserRole } from "../types";

const ROLES: UserRole[] = ["free", "gift", "paid", "admin"];

const ROLE_COLORS: Record<UserRole, string> = {
  free: "text-gray-400",
  gift: "text-green-400",
  paid: "text-accent",
  admin: "text-yellow-400",
};

export function AdminPage({ onClose }: { onClose: () => void }) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    admin
      .listUsers()
      .then(setUsers)
      .finally(() => setLoading(false));
  }, []);

  async function handleRoleChange(userId: string, role: UserRole) {
    setSaving(userId);
    try {
      const updated = await admin.setRole(userId, role);
      setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-surface-800 border border-surface-500 rounded-xl w-full max-w-3xl mx-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-surface-500 shrink-0">
          <h2 className="text-white font-semibold text-base">Admin — Users</h2>
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

        {/* Stats bar */}
        <div className="flex gap-6 px-4 py-3 border-b border-surface-500 text-xs text-gray-400 shrink-0">
          <span>
            Total: <strong className="text-white">{stats.total}</strong>
          </span>
          <span>
            Free: <strong className="text-gray-300">{stats.free}</strong>
          </span>
          <span>
            Gift: <strong className="text-green-400">{stats.gift}</strong>
          </span>
          <span>
            Paid: <strong className="text-accent">{stats.paid}</strong>
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
                    Stripe status
                  </th>
                  <th className="text-left px-4 py-2 text-gray-500 font-medium">
                    Joined
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-surface-600 hover:bg-surface-700"
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
                            {r}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2 text-gray-500 text-xs">
                      {user.stripe_subscription_status ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-gray-500 text-xs">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
