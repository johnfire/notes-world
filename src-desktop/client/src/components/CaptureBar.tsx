import { useRef, useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import * as api from '../api';

interface CaptureBarProps {
  autoTagId?:   string;
  autoTagName?: string;
}

export function CaptureBar({ autoTagId, autoTagName }: CaptureBarProps) {
  const { refresh, addUnsorted } = useApp();
  const [value, setValue]     = useState('');
  const [saving, setSaving]   = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Press 'c' anywhere (outside inputs) to focus
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key !== 'c') return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      e.preventDefault();
      inputRef.current?.focus();
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  async function submit() {
    const title = value.trim();
    if (!title || saving) return;
    setSaving(true);
    try {
      const item = await api.items.capture(title);
      if (autoTagId) await api.tags.tagItem(item.id, autoTagId);
      addUnsorted(item);
      setValue('');
      void refresh();
    } finally {
      setSaving(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') void submit();
    if (e.key === 'Escape') { setValue(''); inputRef.current?.blur(); }
  }

  const placeholder = autoTagName
    ? `Capture under "${autoTagName}"… (press C)`
    : 'Capture something… (press C)';

  return (
    <div className="h-10 bg-surface-700 border-b border-surface-500 flex items-center px-4 gap-2">
      <svg className="w-3.5 h-3.5 text-gray-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={saving}
        className="flex-1 bg-transparent text-sm text-gray-200 placeholder-gray-500 focus:outline-none disabled:opacity-50"
      />
      {value && (
        <button
          onClick={() => void submit()}
          disabled={saving}
          className="text-xs text-accent hover:text-white disabled:opacity-50"
        >
          Add
        </button>
      )}
    </div>
  );
}
