import { Router, Request, Response } from 'express';
import { PHASE1_USER_ID } from '../../constants';
import { wrapAsync } from '../../utils/wrapAsync';
import * as service from './import.service';

export const importRouter = Router();

importRouter.post('/', wrapAsync(async (req: Request, res: Response) => {
  const job = await service.createImportJob(
    PHASE1_USER_ID,
    req.body.source_filename,
    req.body.source_size,
    req.body.auto_tag
  );
  res.status(201).json(job);
}));

importRouter.post('/:id/execute', wrapAsync(async (req: Request, res: Response) => {
  const job = await service.executeImport(PHASE1_USER_ID, req.params.id, req.body.content);
  res.json(job);
}));

importRouter.post('/folder', wrapAsync(async (req: Request, res: Response) => {
  const job = await service.importFolder(PHASE1_USER_ID, req.body.files ?? []);
  res.status(201).json(job);
}));

importRouter.get('/', wrapAsync(async (_req: Request, res: Response) => {
  const jobs = await service.getImportJobs(PHASE1_USER_ID);
  res.json(jobs);
}));

importRouter.get('/:id', wrapAsync(async (req: Request, res: Response) => {
  const result = await service.getImportJobById(PHASE1_USER_ID, req.params.id);
  res.json(result);
}));
