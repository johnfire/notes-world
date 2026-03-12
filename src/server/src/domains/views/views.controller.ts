import { Request, Response, NextFunction } from 'express';
import { PHASE1_USER_ID } from '../../constants';
import * as service from './views.service';

export async function getDashboard(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await service.getDashboard(PHASE1_USER_ID);
    res.json(result);
  } catch (err) { next(err); }
}

export async function addBlock(req: Request, res: Response, next: NextFunction) {
  try {
    const block = await service.addBlock(PHASE1_USER_ID, req.params.dashboardId, {
      view_type: req.body.view_type,
      title:     req.body.title,
      row:       req.body.row,
      column:    req.body.column,
      config:    req.body.config,
    });
    res.status(201).json(block);
  } catch (err) { next(err); }
}

export async function removeBlock(req: Request, res: Response, next: NextFunction) {
  try {
    await service.removeBlock(PHASE1_USER_ID, req.params.blockId);
    res.status(204).send();
  } catch (err) { next(err); }
}

export async function updateBlock(req: Request, res: Response, next: NextFunction) {
  try {
    const block = await service.updateBlock(PHASE1_USER_ID, req.params.blockId, {
      view_type: req.body.view_type,
      title:     req.body.title,
      row:       req.body.row,
      column:    req.body.column,
      config:    req.body.config,
    });
    res.json(block);
  } catch (err) { next(err); }
}

export async function reorderBlocks(req: Request, res: Response, next: NextFunction) {
  try {
    await service.reorderBlocks(PHASE1_USER_ID, req.body.positions);
    res.status(204).send();
  } catch (err) { next(err); }
}
