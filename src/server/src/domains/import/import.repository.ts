import { getPool } from '../../db/client';
import { ImportJob, ImportJobId, ImportJobStatus, ImportRecord, ImportRecordStatus, UserId } from '../../types';

export async function insertImportJob(
  userId: UserId,
  sourceFilename: string,
  sourceSize: number,
  autoTag: string
): Promise<ImportJob> {
  const { rows } = await getPool().query<ImportJob>(
    `INSERT INTO import_jobs (user_id, source_filename, source_size, status, auto_tag)
     VALUES ($1, $2, $3, 'Pending', $4)
     RETURNING *`,
    [userId, sourceFilename, sourceSize, autoTag]
  );
  return rows[0];
}

export async function findImportJobById(id: ImportJobId, userId: UserId): Promise<ImportJob | null> {
  const { rows } = await getPool().query<ImportJob>(
    `SELECT * FROM import_jobs WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
  return rows[0] ?? null;
}

export async function findImportJobs(userId: UserId): Promise<ImportJob[]> {
  const { rows } = await getPool().query<ImportJob>(
    `SELECT * FROM import_jobs WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return rows;
}

export async function updateImportJobStatus(
  id: ImportJobId,
  updates: Partial<Pick<ImportJob, 'status' | 'items_found' | 'items_imported' | 'items_skipped' | 'items_failed' | 'started_at' | 'completed_at' | 'error_message'>>
): Promise<void> {
  const sets: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (updates.status       !== undefined) { sets.push(`status = $${idx++}`);        values.push(updates.status); }
  if (updates.items_found  !== undefined) { sets.push(`items_found = $${idx++}`);   values.push(updates.items_found); }
  if (updates.items_imported !== undefined) { sets.push(`items_imported = $${idx++}`); values.push(updates.items_imported); }
  if (updates.items_skipped !== undefined) { sets.push(`items_skipped = $${idx++}`); values.push(updates.items_skipped); }
  if (updates.items_failed  !== undefined) { sets.push(`items_failed = $${idx++}`);  values.push(updates.items_failed); }
  if (updates.started_at   !== undefined) { sets.push(`started_at = $${idx++}`);    values.push(updates.started_at); }
  if (updates.completed_at !== undefined) { sets.push(`completed_at = $${idx++}`);  values.push(updates.completed_at); }
  if (updates.error_message !== undefined) { sets.push(`error_message = $${idx++}`); values.push(updates.error_message); }

  if (sets.length === 0) return;
  values.push(id);
  await getPool().query(`UPDATE import_jobs SET ${sets.join(', ')} WHERE id = $${idx}`, values);
}

export async function insertImportRecord(
  importJobId: ImportJobId,
  sequence: number,
  rawTitle: string | null,
  rawBody: string | null,
  status: ImportRecordStatus,
  createdItemId: string | null,
  errorMessage: string | null
): Promise<ImportRecord> {
  const { rows } = await getPool().query<ImportRecord>(
    `INSERT INTO import_records
       (import_job_id, sequence, raw_title, raw_body, status, created_item_id, error_message)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [importJobId, sequence, rawTitle, rawBody, status, createdItemId, errorMessage]
  );
  return rows[0];
}

export async function findImportRecords(importJobId: ImportJobId): Promise<ImportRecord[]> {
  const { rows } = await getPool().query<ImportRecord>(
    `SELECT * FROM import_records WHERE import_job_id = $1 ORDER BY sequence ASC`,
    [importJobId]
  );
  return rows;
}
