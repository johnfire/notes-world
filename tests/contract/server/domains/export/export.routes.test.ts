import request from 'supertest';
import { PassThrough } from 'stream';
import { makeTag, TEST_USER_ID } from '../../../../helpers/itemFactory';

jest.mock('../../../../../src/server/src/domains/export/export.service');
jest.mock('../../../../../src/server/src/db/client', () => ({
  getPool:         jest.fn(),
  query:           jest.fn(),
  queryOne:        jest.fn(),
  withTransaction: jest.fn(),
  closePool:       jest.fn(),
}));

import * as service from '../../../../../src/server/src/domains/export/export.service';
import { createApp } from '../../../../../src/server/src/app';

const mockService = service as jest.Mocked<typeof service>;
const app = createApp();

beforeEach(() => jest.clearAllMocks());

// ── GET /api/export/tag/:tagId ────────────────────────────────────────────────

describe('GET /api/export/tag/:tagId', () => {
  test('200 returns markdown with correct headers', async () => {
    mockService.exportTag.mockResolvedValue({
      filename: 'recipes.md',
      markdown: '# recipes\n\n- Pancakes\n',
    });

    const res = await request(app).get('/api/export/tag/tag-123');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/markdown/);
    expect(res.headers['content-disposition']).toContain('recipes.md');
    expect(res.text).toContain('# recipes');
  });

  test('404 when tag not found', async () => {
    const { NotFoundError } = await import('../../../../../src/server/src/utils/errors');
    mockService.exportTag.mockRejectedValue(new NotFoundError('Tag', 'bad'));

    const res = await request(app).get('/api/export/tag/bad');

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

// ── GET /api/export/untagged ──────────────────────────────────────────────────

describe('GET /api/export/untagged', () => {
  test('200 returns markdown', async () => {
    mockService.exportUntagged.mockResolvedValue({
      filename: 'untagged.md',
      markdown: '# Untagged Items\n\n- Orphan\n',
    });

    const res = await request(app).get('/api/export/untagged');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/markdown/);
    expect(res.text).toContain('Orphan');
  });
});

// ── GET /api/export/all ───────────────────────────────────────────────────────

describe('GET /api/export/all', () => {
  test('200 returns zip stream', async () => {
    const stream = new PassThrough();
    mockService.exportAll.mockResolvedValue(stream);

    // End the stream so the response completes
    setTimeout(() => stream.end(Buffer.from('PK\x03\x04fake-zip')), 10);

    const res = await request(app).get('/api/export/all');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/zip/);
    expect(res.headers['content-disposition']).toContain('notes-world-export-');
  });
});
