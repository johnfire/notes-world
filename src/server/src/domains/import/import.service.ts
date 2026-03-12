import { UserId, ImportJob, ImportJobStatus, ImportRecordStatus } from '../../types';
import { eventBus } from '../../events/eventBus';
import { LIMITS } from '../../constants';
import {
  ValidationError,
  NotFoundError,
  StateError,
  AuthorizationError,
  LimitExceeded,
} from '../../utils/errors';
import * as repo from './import.repository';
import * as itemRepo from '../items/items.repository';
import * as relRepo from '../relationships/relationships.repository';
import { parseMarkdown } from './import.parser';

export async function createImportJob(
  userId: UserId,
  sourceFilename: string,
  sourceSize: number,
  autoTag?: string
): Promise<ImportJob> {
  if (!sourceFilename.toLowerCase().endsWith('.md')) {
    throw new ValidationError('Only .md files are supported');
  }
  if (sourceSize > LIMITS.IMPORT_FILE_SIZE_MAX) {
    throw new LimitExceeded('File is too large', { size: sourceSize, maximum: LIMITS.IMPORT_FILE_SIZE_MAX });
  }

  // Default auto_tag = filename without extension
  const tag = (autoTag ?? sourceFilename.replace(/\.md$/i, '')).toLowerCase().trim();

  return repo.insertImportJob(userId, sourceFilename, sourceSize, tag);
}

export async function executeImport(
  userId: UserId,
  importJobId: string,
  fileContent: string
): Promise<ImportJob> {
  const job = await repo.findImportJobById(importJobId, userId);
  if (!job) throw new NotFoundError('ImportJob', importJobId);
  if (job.user_id !== userId) throw new AuthorizationError('Not owner');
  if (job.status !== ImportJobStatus.Pending) {
    throw new StateError('Import job is not in Pending state');
  }

  const now = new Date().toISOString();
  await repo.updateImportJobStatus(importJobId, {
    status: ImportJobStatus.InProgress,
    started_at: now,
  });

  const parsed = parseMarkdown(fileContent);

  if (parsed.length > LIMITS.IMPORT_BATCH_MAX) {
    await repo.updateImportJobStatus(importJobId, {
      status: ImportJobStatus.Failed,
      error_message: `Too many items: found ${parsed.length}, maximum is ${LIMITS.IMPORT_BATCH_MAX}`,
    });
    throw new LimitExceeded('File contains too many items', {
      found: parsed.length,
      maximum: LIMITS.IMPORT_BATCH_MAX,
    });
  }

  await repo.updateImportJobStatus(importJobId, { items_found: parsed.length });

  let imported = 0;
  let skipped  = 0;
  let failed   = 0;

  // Ensure auto_tag exists
  let tagId: string | null = null;
  if (job.auto_tag) {
    let tag = await relRepo.findTagByName(job.auto_tag, userId);
    if (!tag) tag = await relRepo.insertTag(job.auto_tag, userId);
    tagId = tag.id;
  }

  for (let i = 0; i < parsed.length; i++) {
    const { title, body } = parsed[i];

    if (!title.trim()) {
      await repo.insertImportRecord(importJobId, i + 1, title || null, body || null, ImportRecordStatus.Skipped, null, 'Empty title');
      skipped++;
      continue;
    }

    try {
      const item = await itemRepo.insert(userId, title.trim(), body.trim() || undefined);

      // Apply auto_tag
      if (tagId) {
        await relRepo.insertItemTag(item.id, tagId, userId);
      }

      await repo.insertImportRecord(importJobId, i + 1, title, body || null, ImportRecordStatus.Success, item.id, null);
      imported++;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      await repo.insertImportRecord(importJobId, i + 1, title, body || null, ImportRecordStatus.Failed, null, message);
      failed++;
    }
  }

  const completedAt = new Date().toISOString();
  await repo.updateImportJobStatus(importJobId, {
    status: ImportJobStatus.Completed,
    items_imported: imported,
    items_skipped:  skipped,
    items_failed:   failed,
    completed_at:   completedAt,
  });

  const updatedJob = await repo.findImportJobById(importJobId, userId);
  if (!updatedJob) throw new NotFoundError('ImportJob', importJobId);

  eventBus.emit('ImportCompleted', {
    import_job_id:  importJobId,
    items_imported: imported,
    items_failed:   failed,
    completed_at:   completedAt,
  });

  return updatedJob;
}

export async function getImportJobs(userId: UserId): Promise<ImportJob[]> {
  return repo.findImportJobs(userId);
}

export async function getImportJobById(userId: UserId, id: string): Promise<{ job: ImportJob; records: unknown[] }> {
  const job = await repo.findImportJobById(id, userId);
  if (!job) throw new NotFoundError('ImportJob', id);
  const records = await repo.findImportRecords(id);
  return { job, records };
}
