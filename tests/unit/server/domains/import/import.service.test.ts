import { ImportJobStatus, ImportRecordStatus } from '../../../../../src/server/src/types';
import { makeItem, makeTag, TEST_USER_ID } from '../../../../helpers/itemFactory';

jest.mock('../../../../../src/server/src/domains/import/import.repository');
jest.mock('../../../../../src/server/src/domains/import/import.parser');
jest.mock('../../../../../src/server/src/domains/items/items.repository');
jest.mock('../../../../../src/server/src/domains/relationships/relationships.repository');
jest.mock('../../../../../src/server/src/events/eventBus', () => ({
  eventBus: { emit: jest.fn() },
}));

import * as repo from '../../../../../src/server/src/domains/import/import.repository';
import * as parser from '../../../../../src/server/src/domains/import/import.parser';
import * as itemRepo from '../../../../../src/server/src/domains/items/items.repository';
import * as relRepo from '../../../../../src/server/src/domains/relationships/relationships.repository';
import * as service from '../../../../../src/server/src/domains/import/import.service';
import { eventBus } from '../../../../../src/server/src/events/eventBus';

const mockRepo    = repo as jest.Mocked<typeof repo>;
const mockParser  = parser as jest.Mocked<typeof parser>;
const mockItemRepo = itemRepo as jest.Mocked<typeof itemRepo>;
const mockRelRepo  = relRepo as jest.Mocked<typeof relRepo>;
const mockBus      = eventBus.emit as jest.Mock;

const JOB_ID = '00000000-0000-0000-0000-aaaaaaaaaaaa';

function makeJob(overrides: Record<string, unknown> = {}) {
  return {
    id:              JOB_ID,
    user_id:         TEST_USER_ID,
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

// ── createImportJob ──────────────────────────────────────────────────────────

describe('createImportJob', () => {
  test('creates job with auto_tag = filename without extension', async () => {
    const job = makeJob();
    mockRepo.insertImportJob.mockResolvedValue(job as any);

    const result = await service.createImportJob(TEST_USER_ID, 'notes.md', 100);

    expect(mockRepo.insertImportJob).toHaveBeenCalledWith(TEST_USER_ID, 'notes.md', 100, 'notes');
    expect(result).toBe(job);
  });

  test('custom auto_tag overrides filename', async () => {
    const job = makeJob({ auto_tag: 'custom' });
    mockRepo.insertImportJob.mockResolvedValue(job as any);

    await service.createImportJob(TEST_USER_ID, 'notes.md', 100, 'Custom');

    expect(mockRepo.insertImportJob).toHaveBeenCalledWith(TEST_USER_ID, 'notes.md', 100, 'custom');
  });

  test('throws ValidationError when filename does not end in .md', async () => {
    await expect(service.createImportJob(TEST_USER_ID, 'notes.txt', 100))
      .rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(mockRepo.insertImportJob).not.toHaveBeenCalled();
  });

  test('throws LimitExceeded when file too large', async () => {
    const tooBig = 10 * 1024 * 1024 + 1;
    await expect(service.createImportJob(TEST_USER_ID, 'notes.md', tooBig))
      .rejects.toMatchObject({ code: 'LIMIT_EXCEEDED' });
    expect(mockRepo.insertImportJob).not.toHaveBeenCalled();
  });
});

// ── executeImport ────────────────────────────────────────────────────────────

describe('executeImport', () => {
  test('parses content, creates items, updates job counts, emits ImportCompleted', async () => {
    const job = makeJob();
    const completedJob = makeJob({ status: ImportJobStatus.Completed, items_imported: 2 });
    const tag = makeTag({ name: 'notes' });
    const item1 = makeItem({ title: 'Buy milk' });
    const item2 = makeItem({ title: 'Fix bug' });

    mockRepo.findImportJobById
      .mockResolvedValueOnce(job as any)
      .mockResolvedValueOnce(completedJob as any);
    mockRepo.updateImportJobStatus.mockResolvedValue(undefined);
    mockRepo.insertImportRecord.mockResolvedValue({} as any);
    mockRelRepo.findTagByName.mockResolvedValue(tag);
    mockItemRepo.insert
      .mockResolvedValueOnce(item1)
      .mockResolvedValueOnce(item2);
    mockRelRepo.insertItemTag.mockResolvedValue(undefined);
    mockParser.parseMarkdown.mockReturnValue([
      { title: 'Buy milk', body: 'Go to store' },
      { title: 'Fix bug', body: 'In auth' },
    ]);

    const result = await service.executeImport(TEST_USER_ID, JOB_ID, 'some content');

    expect(mockItemRepo.insert).toHaveBeenCalledTimes(2);
    expect(mockRepo.updateImportJobStatus).toHaveBeenCalledWith(JOB_ID, expect.objectContaining({
      status: ImportJobStatus.Completed,
      items_imported: 2,
    }));
    expect(mockBus).toHaveBeenCalledWith('ImportCompleted', expect.objectContaining({
      import_job_id: JOB_ID,
      items_imported: 2,
    }));
    expect(result).toBe(completedJob);
  });

  test('individual item failures do not stop the import', async () => {
    const job = makeJob();
    const completedJob = makeJob({ status: ImportJobStatus.Completed, items_failed: 1, items_imported: 1 });
    const tag = makeTag({ name: 'notes' });
    const goodItem = makeItem({ title: 'Good item' });

    mockRepo.findImportJobById
      .mockResolvedValueOnce(job as any)
      .mockResolvedValueOnce(completedJob as any);
    mockRepo.updateImportJobStatus.mockResolvedValue(undefined);
    mockRepo.insertImportRecord.mockResolvedValue({} as any);
    mockRelRepo.findTagByName.mockResolvedValue(tag);
    mockItemRepo.insert
      .mockRejectedValueOnce(new Error('DB error'))
      .mockResolvedValueOnce(goodItem);
    mockRelRepo.insertItemTag.mockResolvedValue(undefined);
    mockParser.parseMarkdown.mockReturnValue([
      { title: 'Fail item', body: '' },
      { title: 'Good item', body: '' },
    ]);

    const result = await service.executeImport(TEST_USER_ID, JOB_ID, 'some content');

    expect(mockItemRepo.insert).toHaveBeenCalledTimes(2);
    expect(mockRepo.updateImportJobStatus).toHaveBeenCalledWith(JOB_ID, expect.objectContaining({
      status: ImportJobStatus.Completed,
    }));
    expect(result).toBe(completedJob);
  });

  test('empty items (no title) are skipped', async () => {
    const job = makeJob({ auto_tag: null });
    const completedJob = makeJob({ status: ImportJobStatus.Completed, items_skipped: 1 });

    mockRepo.findImportJobById
      .mockResolvedValueOnce(job as any)
      .mockResolvedValueOnce(completedJob as any);
    mockRepo.updateImportJobStatus.mockResolvedValue(undefined);
    mockRepo.insertImportRecord.mockResolvedValue({} as any);
    mockParser.parseMarkdown.mockReturnValue([{ title: '', body: 'some body' }]);

    await service.executeImport(TEST_USER_ID, JOB_ID, 'some content');

    expect(mockItemRepo.insert).not.toHaveBeenCalled();
    expect(mockRepo.insertImportRecord).toHaveBeenCalledWith(
      JOB_ID, expect.any(Number), null, expect.anything(),
      ImportRecordStatus.Skipped, null, 'Empty title'
    );
  });

  test('throws NotFoundError when job not found', async () => {
    mockRepo.findImportJobById.mockResolvedValue(null);

    await expect(service.executeImport(TEST_USER_ID, JOB_ID, 'some content'))
      .rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  test('throws StateError when job not Pending', async () => {
    const job = makeJob({ status: ImportJobStatus.Completed });
    mockRepo.findImportJobById.mockResolvedValue(job as any);

    await expect(service.executeImport(TEST_USER_ID, JOB_ID, 'some content'))
      .rejects.toMatchObject({ code: 'STATE_ERROR' });
  });

  test('throws LimitExceeded when too many items parsed', async () => {
    const job = makeJob();
    mockRepo.findImportJobById.mockResolvedValue(job as any);
    mockRepo.updateImportJobStatus.mockResolvedValue(undefined);
    mockParser.parseMarkdown.mockReturnValue(
      Array.from({ length: 501 }, (_, i) => ({ title: `Item ${i + 1}`, body: '' }))
    );

    await expect(service.executeImport(TEST_USER_ID, JOB_ID, 'some content'))
      .rejects.toMatchObject({ code: 'LIMIT_EXCEEDED' });

    expect(mockRepo.updateImportJobStatus).toHaveBeenCalledWith(JOB_ID, expect.objectContaining({
      status: ImportJobStatus.Failed,
    }));
  });
});

// ── getImportJobs ────────────────────────────────────────────────────────────

describe('getImportJobs', () => {
  test('returns all jobs for user', async () => {
    const jobs = [makeJob(), makeJob({ id: 'other' })];
    mockRepo.findImportJobs.mockResolvedValue(jobs as any);

    const result = await service.getImportJobs(TEST_USER_ID);

    expect(mockRepo.findImportJobs).toHaveBeenCalledWith(TEST_USER_ID);
    expect(result).toBe(jobs);
  });
});

// ── getImportJobById ─────────────────────────────────────────────────────────

describe('getImportJobById', () => {
  test('returns job with records', async () => {
    const job = makeJob();
    const records = [{ id: 'r1' }, { id: 'r2' }];
    mockRepo.findImportJobById.mockResolvedValue(job as any);
    mockRepo.findImportRecords.mockResolvedValue(records as any);

    const result = await service.getImportJobById(TEST_USER_ID, JOB_ID);

    expect(result.job).toBe(job);
    expect(result.records).toBe(records);
  });

  test('throws NotFoundError when not found', async () => {
    mockRepo.findImportJobById.mockResolvedValue(null);

    await expect(service.getImportJobById(TEST_USER_ID, JOB_ID))
      .rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});
