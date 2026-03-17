import { ItemType, ItemStatus } from '../../../../../src/server/src/types';
import { makeItem, TEST_USER_ID, makeTag } from '../../../../helpers/itemFactory';

jest.mock('../../../../../src/server/src/domains/items/items.repository');
jest.mock('../../../../../src/server/src/domains/relationships/relationships.repository');

import * as itemRepo from '../../../../../src/server/src/domains/items/items.repository';
import * as relRepo from '../../../../../src/server/src/domains/relationships/relationships.repository';
import * as service from '../../../../../src/server/src/domains/export/export.service';

const mockItemRepo = itemRepo as jest.Mocked<typeof itemRepo>;
const mockRelRepo = relRepo as jest.Mocked<typeof relRepo>;

beforeEach(() => jest.clearAllMocks());

// ── exportTag ─────────────────────────────────────────────────────────────────

describe('exportTag', () => {
  test('returns markdown with tag name as heading', async () => {
    const tag = makeTag({ name: 'recipes' });
    mockRelRepo.findTagById.mockResolvedValue(tag);
    mockItemRepo.findByTag.mockResolvedValue([
      makeItem({ title: 'Pancakes', item_type: ItemType.Untyped }),
    ]);

    const result = await service.exportTag(TEST_USER_ID, tag.id);

    expect(result.filename).toBe('recipes.md');
    expect(result.markdown).toContain('# recipes');
    expect(result.markdown).toContain('- Pancakes');
  });

  test('formats tasks with checkboxes', async () => {
    const tag = makeTag({ name: 'work' });
    mockRelRepo.findTagById.mockResolvedValue(tag);
    mockItemRepo.findByTag.mockResolvedValue([
      makeItem({
        title: 'Deploy',
        item_type: ItemType.Task,
        type_data: { task_status: 'Done', priority: 'High' } as never,
      }),
      makeItem({
        title: 'Review PR',
        item_type: ItemType.Task,
        type_data: { task_status: 'Open', priority: 'Normal' } as never,
      }),
    ]);

    const result = await service.exportTag(TEST_USER_ID, tag.id);

    expect(result.markdown).toContain('- [x] Deploy (Done, High priority)');
    expect(result.markdown).toContain('- [ ] Review PR (Open)');
  });

  test('formats dividers as headings', async () => {
    const tag = makeTag({ name: 'notes' });
    mockRelRepo.findTagById.mockResolvedValue(tag);
    mockItemRepo.findByTag.mockResolvedValue([
      makeItem({ title: 'Section A', item_type: ItemType.Divider }),
      makeItem({ title: 'Item 1' }),
    ]);

    const result = await service.exportTag(TEST_USER_ID, tag.id);

    expect(result.markdown).toContain('## Section A');
    expect(result.markdown).toContain('- Item 1');
  });

  test('formats untitled dividers as hr', async () => {
    const tag = makeTag({ name: 'notes' });
    mockRelRepo.findTagById.mockResolvedValue(tag);
    mockItemRepo.findByTag.mockResolvedValue([
      makeItem({ title: '', item_type: ItemType.Divider }),
    ]);

    const result = await service.exportTag(TEST_USER_ID, tag.id);
    expect(result.markdown).toContain('---');
  });

  test('includes item body indented', async () => {
    const tag = makeTag({ name: 'notes' });
    mockRelRepo.findTagById.mockResolvedValue(tag);
    mockItemRepo.findByTag.mockResolvedValue([
      makeItem({ title: 'Thought', body: 'line 1\nline 2' }),
    ]);

    const result = await service.exportTag(TEST_USER_ID, tag.id);
    expect(result.markdown).toContain('  line 1');
    expect(result.markdown).toContain('  line 2');
  });

  test('includes color as HTML comment', async () => {
    const tag = makeTag({ name: 'colors' });
    mockRelRepo.findTagById.mockResolvedValue(tag);
    mockItemRepo.findByTag.mockResolvedValue([
      makeItem({ title: 'Red item', color: '#ff0000' }),
    ]);

    const result = await service.exportTag(TEST_USER_ID, tag.id);
    expect(result.markdown).toContain('<!-- color: #ff0000 -->');
  });

  test('throws NotFoundError for missing tag', async () => {
    mockRelRepo.findTagById.mockResolvedValue(null);

    await expect(service.exportTag(TEST_USER_ID, 'bad-id'))
      .rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  test('sanitizes tag name in filename', async () => {
    const tag = makeTag({ name: 'my tag / special' });
    mockRelRepo.findTagById.mockResolvedValue(tag);
    mockItemRepo.findByTag.mockResolvedValue([]);

    const result = await service.exportTag(TEST_USER_ID, tag.id);
    expect(result.filename).toBe('my_tag___special.md');
    expect(result.filename).not.toContain('/');
  });
});

// ── exportUntagged ────────────────────────────────────────────────────────────

describe('exportUntagged', () => {
  test('returns untagged items markdown', async () => {
    mockItemRepo.findUntagged.mockResolvedValue([
      makeItem({ title: 'Loose note' }),
    ]);

    const result = await service.exportUntagged(TEST_USER_ID);

    expect(result.filename).toBe('untagged.md');
    expect(result.markdown).toContain('# Untagged Items');
    expect(result.markdown).toContain('- Loose note');
  });

  test('returns empty markdown when no untagged items', async () => {
    mockItemRepo.findUntagged.mockResolvedValue([]);

    const result = await service.exportUntagged(TEST_USER_ID);

    expect(result.markdown).toContain('# Untagged Items');
  });
});

// ── exportAll ─────────────────────────────────────────────────────────────────

describe('exportAll', () => {
  test('returns a readable stream', async () => {
    mockRelRepo.findAllTags.mockResolvedValue([]);
    mockItemRepo.findUntagged.mockResolvedValue([]);

    const stream = await service.exportAll(TEST_USER_ID);

    expect(stream).toBeDefined();
    expect(typeof stream.pipe).toBe('function');
    stream.destroy();
  });

  test('includes tag files and untagged in archive', async () => {
    const tag = makeTag({ name: 'recipes' });
    mockRelRepo.findAllTags.mockResolvedValue([tag]);
    mockItemRepo.findByTag.mockResolvedValue([makeItem({ title: 'Pancakes' })]);
    mockItemRepo.findUntagged.mockResolvedValue([makeItem({ title: 'Orphan' })]);

    const stream = await service.exportAll(TEST_USER_ID);

    // Consume the stream to ensure no errors
    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('end', resolve);
      stream.on('error', reject);
    });

    // Should produce a non-empty zip
    expect(Buffer.concat(chunks).length).toBeGreaterThan(0);
  });
});
