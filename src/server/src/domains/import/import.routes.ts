import { Router, Request, Response, NextFunction } from 'express';
import { PHASE1_USER_ID } from '../../constants';
import * as service from './import.service';

export const importRouter = Router();

importRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const job = await service.createImportJob(
      PHASE1_USER_ID,
      req.body.source_filename,
      req.body.source_size,
      req.body.auto_tag
    );
    res.status(201).json(job);
  } catch (err) { next(err); }
});

importRouter.post('/:id/execute', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const job = await service.executeImport(PHASE1_USER_ID, req.params.id, req.body.content);
    res.json(job);
  } catch (err) { next(err); }
});

importRouter.post('/folder', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const job = await service.importFolder(PHASE1_USER_ID, req.body.files ?? []);
    res.status(201).json(job);
  } catch (err) { next(err); }
});

importRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const jobs = await service.getImportJobs(PHASE1_USER_ID);
    res.json(jobs);
  } catch (err) { next(err); }
});

importRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await service.getImportJobById(PHASE1_USER_ID, req.params.id);
    res.json(result);
  } catch (err) { next(err); }
});
