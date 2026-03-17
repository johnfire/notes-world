import { Request, Response } from 'express';
import { PHASE1_USER_ID } from '../../constants';
import { wrapAsync } from '../../utils/wrapAsync';
import * as service from './views.service';

export const getDashboard = wrapAsync(async (_req: Request, res: Response) => {
  const result = await service.getDashboard(PHASE1_USER_ID);
  res.json(result);
});

export const addBlock = wrapAsync(async (req: Request, res: Response) => {
  const block = await service.addBlock(PHASE1_USER_ID, req.params.dashboardId, {
    view_type: req.body.view_type,
    title:     req.body.title,
    row:       req.body.row,
    column:    req.body.column,
    config:    req.body.config,
  });
  res.status(201).json(block);
});

export const removeBlock = wrapAsync(async (req: Request, res: Response) => {
  await service.removeBlock(PHASE1_USER_ID, req.params.blockId);
  res.status(204).send();
});

export const updateBlock = wrapAsync(async (req: Request, res: Response) => {
  const block = await service.updateBlock(PHASE1_USER_ID, req.params.blockId, {
    view_type: req.body.view_type,
    title:     req.body.title,
    row:       req.body.row,
    column:    req.body.column,
    config:    req.body.config,
  });
  res.json(block);
});

export const reorderBlocks = wrapAsync(async (req: Request, res: Response) => {
  await service.reorderBlocks(PHASE1_USER_ID, req.body.positions);
  res.status(204).send();
});
