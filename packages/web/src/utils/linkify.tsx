import React from 'react';

const URL_RE = /(https?:\/\/[^\s<>[\]()'"]+)/g;

// Only http(s) URLs ever become links. The capture regex already restricts the
// scheme, but we re-check at the sink by parsing the URL — so the href can never
// carry a javascript:/data:/vbscript: scheme even if URL_RE is later loosened.
// This also avoids the stateful-lastIndex pitfall of calling a /g regex's
// .test() inside the map.
function isSafeHttpUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

export function linkify(text: string): React.ReactNode {
  const parts = text.split(URL_RE);
  if (parts.length === 1) return text;

  return parts.map((part, i) =>
    isSafeHttpUrl(part) ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className="text-accent hover:underline"
        onClick={e => e.stopPropagation()}
      >
        {part}
      </a>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    )
  );
}
