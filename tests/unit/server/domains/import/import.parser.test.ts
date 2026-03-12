import { parseMarkdown } from '../../../../../src/server/src/domains/import/import.parser';

describe('parseMarkdown', () => {
  test('parses ## headings as items', () => {
    const md = `## Buy milk\nGo to the store\n\n## Fix bug\nIn the login page`;
    const items = parseMarkdown(md);
    expect(items).toHaveLength(2);
    expect(items[0].title).toBe('Buy milk');
    expect(items[0].body).toBe('Go to the store');
    expect(items[1].title).toBe('Fix bug');
  });

  test('parses ### headings as items', () => {
    const md = `### Task one\nDo something\n\n### Task two\nDo another`;
    const items = parseMarkdown(md);
    expect(items).toHaveLength(2);
    expect(items[0].title).toBe('Task one');
  });

  test('uses first line as title when no heading', () => {
    const md = `Just a plain title\nWith a body`;
    const items = parseMarkdown(md);
    expect(items[0].title).toBe('Just a plain title');
    expect(items[0].body).toBe('With a body');
  });

  test('handles double blank lines as separator', () => {
    const md = `First item\n\n\nSecond item`;
    const items = parseMarkdown(md);
    expect(items.length).toBeGreaterThanOrEqual(2);
  });

  test('filters empty sections', () => {
    const md = `## Item one\n\n\n\n## Item two`;
    const items = parseMarkdown(md);
    expect(items.every(i => i.title.length > 0 || i.body.length > 0)).toBe(true);
  });

  test('returns empty array for empty input', () => {
    expect(parseMarkdown('')).toHaveLength(0);
    expect(parseMarkdown('   \n\n  ')).toHaveLength(0);
  });

  test('body is empty string when no body content', () => {
    const md = `## Just a title`;
    const items = parseMarkdown(md);
    expect(items[0].title).toBe('Just a title');
    expect(items[0].body).toBe('');
  });
});
