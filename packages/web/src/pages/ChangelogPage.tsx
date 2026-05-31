import { useEffect, useState } from "react";

interface Entry {
  hash: string;
  message: string;
  date: string;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function typeTag(message: string) {
  const prefix = message.split(/[:(]/)[0].toLowerCase();
  const map: Record<string, string> = {
    feat: "bg-accent/20 text-accent",
    fix: "bg-danger/20 text-danger",
    ci: "bg-surface-500 text-gray-400",
    chore: "bg-surface-500 text-gray-400",
    docs: "bg-yellow-400/20 text-yellow-400",
    refactor: "bg-purple-400/20 text-purple-400",
    test: "bg-green-400/20 text-green-400",
  };
  return map[prefix] ?? "bg-surface-500 text-gray-400";
}

export function ChangelogPage({ onClose }: { onClose: () => void }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/changelog.json")
      .then((r) => {
        if (!r.ok) throw new Error("not found");
        return r.json() as Promise<Entry[]>;
      })
      .then(setEntries)
      .catch(() => setError(true));
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-surface-800 border border-surface-500 rounded-xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-surface-500 shrink-0">
          <h2 className="text-white font-semibold text-base">What's new</h2>
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

        <div className="overflow-y-auto flex-1 p-4">
          {error ? (
            <p className="text-gray-500 text-sm text-center py-8">
              Changelog not available.
            </p>
          ) : entries.length === 0 ? (
            <div className="flex justify-center py-8">
              <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <ol className="space-y-3">
              {entries.map((e) => (
                <li key={e.hash} className="flex gap-3 items-start">
                  <span
                    className={`mt-0.5 shrink-0 text-[10px] font-mono px-1.5 py-0.5 rounded ${typeTag(e.message)}`}
                  >
                    {e.hash}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm text-gray-200 leading-snug">
                      {e.message}
                    </p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {formatDate(e.date)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
