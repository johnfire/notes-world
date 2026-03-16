import { Request, Response, NextFunction } from 'express';
import { PHASE1_USER_ID } from '../../constants';
import * as service from './export.service';

export async function exportTag(req: Request, res: Response, next: NextFunction) {
  try {
    const { filename, markdown } = await service.exportTag(PHASE1_USER_ID, req.params.tagId);
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(markdown);
  } catch (err) { next(err); }
}

export async function exportUntagged(_req: Request, res: Response, next: NextFunction) {
  try {
    const { filename, markdown } = await service.exportUntagged(PHASE1_USER_ID);
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(markdown);
  } catch (err) { next(err); }
}

export async function exportAll(_req: Request, res: Response, next: NextFunction) {
  try {
    const stream = await service.exportAll(PHASE1_USER_ID);
    const date = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="notes-world-export-${date}.zip"`);
    stream.pipe(res);
  } catch (err) { next(err); }
}
