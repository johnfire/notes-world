import { useState, useRef } from 'react';
import { Block } from '../../types';
import { useApp } from '../../context/AppContext';

interface Props { block: Block }

export function QuickCapture({ block }: Props) {
  const { captureItem } = useApp();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      await captureItem(title.trim(), body.trim() || undefined);
      setTitle('');
      setBody('');
      setExpanded(false);
      setFlash(true);
      setTimeout(() => setFlash(false), 800);
      titleRef.current?.focus();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={`card h-full transition-colors ${flash ? 'border-accent/60' : ''}`}>
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
        {block.title ?? 'Quick Capture'}
      </h3>
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <input
          ref={titleRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onFocus={() => setExpanded(true)}
          placeholder="Capture a thought…"
          maxLength={300}
          className="input text-sm"
          autoComplete="off"
        />
        {expanded && (
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Additional notes (optional)"
            rows={3}
            className="input text-sm resize-none"
          />
        )}
        <div className="flex items-center justify-between gap-2">
          <span className={`text-xs ${title.length > 270 ? 'text-warning' : 'text-gray-600'}`}>
            {title.length}/300
          </span>
          <div className="flex gap-2">
            {expanded && (
              <button
                type="button"
                onClick={() => { setExpanded(false); setBody(''); }}
                className="btn-ghost text-xs"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={!title.trim() || saving}
              className="btn-primary text-xs"
            >
              {saving ? 'Saving…' : 'Capture'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
