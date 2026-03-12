import request from 'supertest';
import { ImportJobStatus } from '../../../../../src/server/src/types';

// Mock service and DB before importing the app
jest.mock('../../../../../src/server/src/domains/import/import.service');
jest.mock('../../../../../src/server/src/db/client', () => ({
  getPool:         jest.fn(),
  query:           jest.fn(),
  queryOne:        jest.fn(),
  withTransaction: jest.fn(),
  closePool:       jest.fn(),
}));

import * as service from '../../../../../src/server/src/domains/import/import.service';
import { createApp } from '../../../../../src/server/src/app';

const mockService = service as jest.Mocked<typeof service>;
const app = createApp();

const JOB_ID = '00000000-0000-0000-0000-aaaaaaaaaaaa';

function makeJob(overrides: Record<string, unknown> = {}) {
  return {
    id:              JOB_ID,
    user_id:         '00000000-0000-0000-0000-000000000001',
    source_filename: 'notes.md',
    source_size:     100,
    status:          ImportJobStatus.Pending,
    items_found:     0,
    items_imported:  0,
    items_skipped:   0,
    items_failed:    0,
    auto_tag:        'notes',
    started_at:      null,
    completed_at:    null,
    error_message:   null,
    created_at:      new Date().toISOString(),
    ...overrides,
  };
}

beforeEach(() => jest.clearAllMocks());

// ── POST /api/import ─────────────────────────────────────────────────────────

describe('POST /api/import', () => {
  test('201 with created job', async () => {
    const job = makeJob();
    mockService.createImportJob.mockResolvedValue(job as any);

    const res = await request(app)
      .post('/api/import')
      .send({ source_filename: 'notes.md', source_size: 100 });

    expect(res.status).toBe(201);
    expect(res.body.id).toBe(JOB_ID);
    expect(res.body.source_filename).toBe('notes.md');
  });

  test('422 when filename is invalid', async () => {
    const { ValidationError } = await import('../../../../../src/server/src/utils/errors');
    mockService.createImportJob.mockRejectedValue(new ValidationError('Only .md files are supported'));

    const res = await request(app)
      .post('/api/import')
      .send({ source_filename: 'notes.txt', source_size: 100 });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('422 when file too large', async () => {
    const { LimitExceeded } = await import('../../../../../src/server/src/utils/errors');
    mockService.createImportJob.mockRejectedValue(new LimitExceeded('File is too large'));

    const res = await request(app)
      .post('/api/import')
      .send({ source_filename: 'big.md', source_size: 99999999 });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('LIMIT_EXCEEDED');
  });
});

// ── POST /api/import/:id/execute ─────────────────────────────────────────────

describe('POST /api/import/:id/execute', () => {
  test('200 with completed job', async () => {
    const job = makeJob({ status: ImportJobStatus.Completed, items_imported: 3 });
    mockService.executeImport.mockResolvedValue(job as any);

    const res = await request(app)
      .post(`/api/import/${JOB_ID}/execute`)
      .send({ content: '## Item 1\n\n## Item 2\n\n## Item 3' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe(ImportJobStatus.Completed);
    expect(res.body.items_imported).toBe(3);
  });

  test('404 when job not found', async () => {
    const { NotFoundError } = await import('../../../../../src/server/src/utils/errors');
    mockService.executeImport.mockRejectedValue(new NotFoundError('ImportJob', JOB_ID));

    const res = await request(app)
      .post(`/api/import/${JOB_ID}/execute`)
      .send({ content: '## Hello' });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  test('422 when job not in Pending state', async () => {
    const { StateError } = await import('../../../../../src/server/src/utils/errors');
    mockService.executeImport.mockRejectedValue(new StateError('Import job is not in Pending state'));

    const res = await request(app)
      .post(`/api/import/${JOB_ID}/execute`)
      .send({ content: '## Hello' });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('STATE_ERROR');
  });
});

// ── GET /api/import ──────────────────────────────────────────────────────────

describe('GET /api/import', () => {
  test('200 with list of jobs', async () => {
    const jobs = [makeJob(), makeJob({ id: 'other-id' })];
    mockService.getImportJobs.mockResolvedValue(jobs as any);

    const res = await request(app).get('/api/import');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  test('200 with empty array when no jobs', async () => {
    mockService.getImportJobs.mockResolvedValue([]);

    const res = await request(app).get('/api/import');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

// ── GET /api/import/:id ──────────────────────────────────────────────────────

describe('GET /api/import/:id', () => {
  test('200 with job and records', async () => {
    const job = makeJob();
    const result = { job, records: [{ id: 'r1', sequence: 1 }] };
    mockService.getImportJobById.mockResolvedValue(result as any);

    const res = await request(app).get(`/api/import/${JOB_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.job.id).toBe(JOB_ID);
    expect(res.body.records).toHaveLength(1);
  });

  test('404 when job not found', async () => {
    const { NotFoundError } = await import('../../../../../src/server/src/utils/errors');
    mockService.getImportJobById.mockRejectedValue(new NotFoundError('ImportJob', JOB_ID));

    const res = await request(app).get(`/api/import/${JOB_ID}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
