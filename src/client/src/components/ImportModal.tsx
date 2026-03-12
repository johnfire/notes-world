import { useState, useRef } from 'react';
import * as api from '../api';
import { ImportJob } from '../types';

interface Props {
  onClose: () => void;
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

export function ImportModal({ onClose }: Props) {
  const [file, setFile]         = useState<File | null>(null);
  const [autoTag, setAutoTag]   = useState('');
  const [status, setStatus]     = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [result, setResult]     = useState<ImportJob | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    if (f) setAutoTag(f.name.replace(/\.md$/i, ''));
  }

  async function handleImport() {
    if (!file) return;
    setStatus('running');
    try {
      const content = await readFileAsText(file);
      const job = await api.importApi.create(file.name, file.size, autoTag || undefined);
      const completed = await api.importApi.execute(job.id, content);
      setResult(completed);
      setStatus('done');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Import failed');
      setStatus('error');
    }
  }

  function handleReset() {
    setFile(null);
    setAutoTag('');
    setStatus('idle');
    setResult(null);
    setErrorMsg('');
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 z-50" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-surface-800 border border-surface-500 rounded-lg shadow-2xl w-full max-w-md pointer-events-auto">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-surface-500">
            <h2 className="text-sm font-semibold text-white">Import from Markdown</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-white">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-4">
            {status === 'idle' && (
              <>
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 block">Markdown file</label>
                  <input
                    ref={inputRef}
                    type="file"
                    accept=".md"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-gray-400 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:bg-surface-600 file:text-gray-300 hover:file:bg-surface-500 cursor-pointer"
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    Each ## heading or double blank line creates a new item.
                  </p>
                </div>

                {file && (
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 block">Auto-tag</label>
                    <input
                      className="w-full bg-surface-700 border border-surface-500 rounded-md px-3 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-accent"
                      value={autoTag}
                      onChange={e => setAutoTag(e.target.value)}
                      placeholder="Tag to apply to all imported items"
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      Defaults to filename. Leave blank to skip tagging.
                    </p>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-1">
                  <button onClick={onClose} className="btn-ghost text-xs">Cancel</button>
                  <button
                    onClick={() => void handleImport()}
                    disabled={!file}
                    className="px-3 py-1.5 text-xs rounded bg-accent text-white hover:bg-accent/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Import
                  </button>
                </div>
              </>
            )}

            {status === 'running' && (
              <div className="flex items-center gap-3 py-4">
                <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin shrink-0" />
                <p className="text-sm text-gray-400">Importing…</p>
              </div>
            )}

            {status === 'done' && result && (
              <>
                <div className="bg-surface-700 rounded-md p-4 space-y-2">
                  <p className="text-sm font-medium text-white mb-3">Import complete</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="text-gray-500">Items found</div>
                    <div className="text-gray-300">{result.items_found}</div>
                    <div className="text-gray-500">Imported</div>
                    <div className="text-green-400">{result.items_imported}</div>
                    {result.items_skipped > 0 && (
                      <>
                        <div className="text-gray-500">Skipped</div>
                        <div className="text-gray-400">{result.items_skipped}</div>
                      </>
                    )}
                    {result.items_failed > 0 && (
                      <>
                        <div className="text-gray-500">Failed</div>
                        <div className="text-red-400">{result.items_failed}</div>
                      </>
                    )}
                    {result.auto_tag && (
                      <>
                        <div className="text-gray-500">Tagged with</div>
                        <div className="text-accent">#{result.auto_tag}</div>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={handleReset} className="btn-ghost text-xs">Import another</button>
                  <button onClick={onClose} className="px-3 py-1.5 text-xs rounded bg-surface-600 text-gray-200 hover:bg-surface-500 transition-colors">Done</button>
                </div>
              </>
            )}

            {status === 'error' && (
              <>
                <div className="bg-surface-700 rounded-md p-3">
                  <p className="text-xs text-danger">{errorMsg}</p>
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={handleReset} className="btn-ghost text-xs">Try again</button>
                  <button onClick={onClose} className="btn-ghost text-xs">Close</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
