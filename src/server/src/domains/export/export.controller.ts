import { Request, Response } from 'express';
import { PHASE1_USER_ID } from '../../constants';
import { wrapAsync } from '../../utils/wrapAsync';
import * as service from './export.service';

export const exportTag = wrapAsync(async (req: Request, res: Response) => {
  const { filename, markdown } = await service.exportTag(PHASE1_USER_ID, req.params.tagId);
  res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(markdown);
});

export const exportUntagged = wrapAsync(async (_req: Request, res: Response) => {
  const { filename, markdown } = await service.exportUntagged(PHASE1_USER_ID);
  res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(markdown);
});

export const exportAll = wrapAsync(async (_req: Request, res: Response) => {
  const stream = await service.exportAll(PHASE1_USER_ID);
  const date = new Date().toISOString().slice(0, 10);
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="notes-world-export-${date}.zip"`);
  stream.pipe(res);
});
