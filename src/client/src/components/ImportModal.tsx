import { useState, useRef } from 'react';
import * as api from '../api';
import { ImportJob } from '../types';

interface Props {
  onClose:      () => void;
  onImported?:  () => void;
}

interface FileEntry {
  path:    string;
  content: string;
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = e => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

export function ImportModal({ onClose, onImported }: Props) {
  const [status, setStatus]     = useState<'idle' | 'reading' | 'preview' | 'running' | 'done' | 'error'>('idle');
  const [files, setFiles]       = useState<FileEntry[]>([]);
  const [result, setResult]     = useState<ImportJob | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFolderChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []).filter(f =>
      f.name.toLowerCase().endsWith('.md')
    );
    if (selected.length === 0) return;

    setStatus('reading');
    const entries: FileEntry[] = await Promise.all(
      selected.map(async f => ({
        path:    (f as File & { webkitRelativePath: string }).webkitRelativePath || f.name,
        content: await readFileAsText(f),
      }))
    );
    setFiles(entries);
    setStatus('preview');
  }

  async function handleImport() {
    setStatus('running');
    try {
      const job = await api.importApi.folder(files);
      setResult(job);
      setStatus('done');
      onImported?.();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Import failed');
      setStatus('error');
    }
  }

  function handleReset() {
    setFiles([]);
    setStatus('idle');
    setResult(null);
    setErrorMsg('');
    if (inputRef.current) inputRef.current.value = '';
  }

  // Group files by folder for preview
  const folderGroups = files.reduce<Record<string, string[]>>((acc, f) => {
    const parts  = f.path.split('/');
    const folder = parts.length > 1 ? parts.slice(0, -1).join('/') : '(root)';
    (acc[folder] ??= []).push(parts[parts.length - 1]);
    return acc;
  }, {});

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-surface-800 border border-surface-500 rounded-lg shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-500">
          <h2 className="text-sm font-semibold text-white">Import from Folder</h2>
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
              <p className="text-xs text-gray-500">
                Select a folder of <code className="text-gray-400">.md</code> files.
                Subfolder names become tags automatically.
              </p>
              <div className="text-xs text-gray-600 bg-surface-700 rounded p-3 space-y-0.5">
                <div><span className="text-gray-500">notes/work/standup.md</span> → tags: <span className="text-accent">work</span></div>
                <div><span className="text-gray-500">notes/work/meetings/q1.md</span> → tags: <span className="text-accent">work, meetings</span></div>
                <div><span className="text-gray-500">notes/ideas.md</span> → no tags</div>
              </div>
              <div>
                <input
                  ref={inputRef}
                  type="file"
                  /* @ts-expect-error webkitdirectory is non-standard */
                  webkitdirectory=""
                  multiple
                  onChange={handleFolderChange}
                  className="block w-full text-sm text-gray-400 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:bg-surface-600 file:text-gray-300 hover:file:bg-surface-500 cursor-pointer"
                />
              </div>
              <div className="flex justify-end">
                <button onClick={onClose} className="btn-ghost text-xs">Cancel</button>
              </div>
            </>
          )}

          {status === 'reading' && (
            <div className="flex items-center gap-3 py-4">
              <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin shrink-0" />
              <p className="text-sm text-gray-400">Reading files…</p>
            </div>
          )}

          {status === 'preview' && (
            <>
              <p className="text-sm text-gray-300">
                <span className="font-medium text-white">{files.length}</span> .md file{files.length !== 1 ? 's' : ''} found
              </p>
              <div className="bg-surface-700 rounded-md p-3 max-h-48 overflow-y-auto space-y-2 text-xs">
                {Object.entries(folderGroups).map(([folder, fnames]) => (
                  <div key={folder}>
                    <div className="text-gray-500 mb-0.5">{folder}/</div>
                    {fnames.map(name => (
                      <div key={name} className="pl-3 text-gray-400">• {name}</div>
                    ))}
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={handleReset} className="btn-ghost text-xs">Back</button>
                <button
                  onClick={() => void handleImport()}
                  className="px-3 py-1.5 text-xs rounded bg-accent text-white hover:bg-accent/80 transition-colors"
                >
                  Import {files.length} file{files.length !== 1 ? 's' : ''}
                </button>
              </div>
            </>
          )}

          {status === 'running' && (
            <div className="flex items-center gap-3 py-4">
              <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin shrink-0" />
              <p className="text-sm text-gray-400">Importing {files.length} files…</p>
            </div>
          )}

          {status === 'done' && result && (
            <>
              <div className="bg-surface-700 rounded-md p-4 space-y-2">
                <p className="text-sm font-medium text-white mb-3">Import complete</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="text-gray-500">Files processed</div>
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
  );
}
