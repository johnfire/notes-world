import { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { ImportModal } from '../ImportModal';

export function ActionBar() {
  const { state, search, clearSearch, refresh } = useApp();
  const [searchInput, setSearchInput] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut: / to focus search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        inputRef.current?.blur();
        setSearchInput('');
        clearSearch();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [clearSearch]);

  const handleSearch = (value: string) => {
    setSearchInput(value);
    if (!value.trim()) {
      clearSearch();
      return;
    }
    const timer = setTimeout(() => search(value), 300);
    return () => clearTimeout(timer);
  };

  return (
    <header className="h-14 bg-surface-900 border-b border-surface-500 flex items-center px-4 gap-4 shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2 mr-2">
        <div className="w-6 h-6 rounded bg-accent flex items-center justify-center">
          <span className="text-white text-xs font-bold">N</span>
        </div>
        <span className="text-white font-semibold text-sm tracking-wide">notes-world</span>
      </div>

      {/* Search */}
      <div className="flex-1 max-w-xl relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={searchInput}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search items… (press / to focus)"
          className="w-full bg-surface-700 border border-surface-500 rounded-md pl-9 pr-3 py-1.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
        />
        {searchInput && (
          <button
            onClick={() => { setSearchInput(''); clearSearch(); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Status indicator */}
      {state.loading && (
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
          Loading
        </div>
      )}
      {state.error && (
        <div className="flex items-center gap-1.5 text-xs text-danger">
          <div className="w-1.5 h-1.5 rounded-full bg-danger" />
          {state.error}
        </div>
      )}

      {/* Import button */}
      <button
        onClick={() => setImportOpen(true)}
        className="btn-ghost text-xs shrink-0"
      >
        Import
      </button>

      {importOpen && <ImportModal onClose={() => setImportOpen(false)} onImported={() => void refresh()} />}
    </header>
  );
}
