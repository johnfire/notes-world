import { useState } from "react";
import * as api from "../api";

type Status = "idle" | "submitting" | "done" | "error";

export function BugReportButton() {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [issue, setIssue] = useState<{ number: number; url: string } | null>(
    null,
  );

  function close() {
    setOpen(false);
    setDescription("");
    setStatus("idle");
    setErrorMsg("");
    setIssue(null);
  }

  async function handleSubmit() {
    if (!description.trim()) return;
    setStatus("submitting");
    setErrorMsg("");
    try {
      const result = await api.bugReports.submit({
        description: description.trim(),
        page: window.location.pathname,
        userAgent: navigator.userAgent,
      });
      setIssue(result);
      setStatus("done");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to send report");
      setStatus("error");
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Report a bug"
        className="fixed bottom-4 right-4 z-40 px-3 py-2 text-xs rounded-full bg-surface-700 border border-surface-500 text-gray-300 shadow-lg hover:bg-surface-600 hover:text-white transition-colors"
      >
        Report a bug
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div className="bg-surface-800 border border-surface-500 rounded-lg shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-500">
              <h2 className="text-sm font-semibold text-white">Report a bug</h2>
              <button
                onClick={close}
                className="text-gray-500 hover:text-white"
              >
                <svg
                  className="w-4 h-4"
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

            <div className="p-5 space-y-4">
              {(status === "idle" ||
                status === "submitting" ||
                status === "error") && (
                <>
                  <p className="text-xs text-gray-500">
                    Describe what went wrong. We attach the page you're on and
                    your browser info automatically.
                  </p>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={5}
                    maxLength={5000}
                    placeholder="What happened? What did you expect?"
                    className="w-full bg-surface-700 border border-surface-500 rounded p-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-accent"
                  />
                  {status === "error" && (
                    <p className="text-xs text-danger">{errorMsg}</p>
                  )}
                  <div className="flex justify-end gap-2">
                    <button onClick={close} className="btn-ghost text-xs">
                      Cancel
                    </button>
                    <button
                      onClick={() => void handleSubmit()}
                      disabled={!description.trim() || status === "submitting"}
                      className="px-3 py-1.5 text-xs rounded bg-accent text-white hover:bg-accent/80 transition-colors disabled:opacity-50"
                    >
                      {status === "submitting" ? "Sending…" : "Send report"}
                    </button>
                  </div>
                </>
              )}

              {status === "done" && issue && (
                <>
                  <div className="bg-surface-700 rounded-md p-4">
                    <p className="text-sm text-gray-200">
                      Thanks — filed as{" "}
                      <a
                        href={issue.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent hover:underline"
                      >
                        issue #{issue.number}
                      </a>
                      .
                    </p>
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={close}
                      className="px-3 py-1.5 text-xs rounded bg-surface-600 text-gray-200 hover:bg-surface-500 transition-colors"
                    >
                      Done
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
