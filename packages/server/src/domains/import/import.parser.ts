export interface ParsedItem {
  title: string;
  body:  string;
}

/**
 * Split markdown content into discrete items.
 * Separators: ## or ### headings, horizontal rules (--- or ***), double blank lines.
 */
export function parseMarkdown(content: string): ParsedItem[] {
  // Normalize line endings
  const text = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Split on: heading (## or ###), horizontal rule (--- or ***), or double blank line
  const sections = text.split(/(?=^#{2,3}\s)|(?<=\n)---\s*\n|(?<=\n)\*\*\*\s*\n|\n{2,}/gm);

  const items: ParsedItem[] = [];

  for (const section of sections) {
    const trimmed = section.trim();
    if (!trimmed) continue;

    const lines = trimmed.split('\n');
    let title = '';
    let bodyLines: string[] = [];

    const firstLine = lines[0].trim();

    if (firstLine.startsWith('### ')) {
      title = firstLine.slice(4).trim();
      bodyLines = lines.slice(1);
    } else if (firstLine.startsWith('## ')) {
      title = firstLine.slice(3).trim();
      bodyLines = lines.slice(1);
    } else {
      // No heading — use first line as title
      title = firstLine;
      bodyLines = lines.slice(1);
    }

    const body = bodyLines.join('\n').trim();

    items.push({ title, body });
  }

  return items;
}
