import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Block } from "../../types";
import { useApp } from "../../context/AppContext";

interface Props {
  block: Block;
}

export function QuickCapture({ block }: Props) {
  const { t } = useTranslation();
  const { captureItem } = useApp();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
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
      setTitle("");
      setBody("");
      setExpanded(false);
      setFlash(true);
      setTimeout(() => setFlash(false), 800);
      titleRef.current?.focus();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className={`card h-full transition-colors ${flash ? "border-accent/60" : ""}`}
    >
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
        {block.title ?? t("app.blocks.quickCapture.title")}
      </h3>
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <input
          ref={titleRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onFocus={() => setExpanded(true)}
          placeholder={t("app.blocks.quickCapture.placeholder")}
          maxLength={300}
          className="input text-sm"
          autoComplete="off"
        />
        {expanded && (
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={t("app.blocks.quickCapture.notesPlaceholder")}
            rows={3}
            className="input text-sm resize-none"
          />
        )}
        <div className="flex items-center justify-between gap-2">
          <span
            className={`text-xs ${title.length > 270 ? "text-warning" : "text-gray-600"}`}
          >
            {title.length}/300
          </span>
          <div className="flex gap-2">
            {expanded && (
              <button
                type="button"
                onClick={() => {
                  setExpanded(false);
                  setBody("");
                }}
                className="btn-ghost text-xs"
              >
                {t("app.actions.cancel")}
              </button>
            )}
            <button
              type="submit"
              disabled={!title.trim() || saving}
              className="btn-primary text-xs"
            >
              {saving ? t("app.actions.saving") : t("app.actions.capture")}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
