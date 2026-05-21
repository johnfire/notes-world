import { Request, Response } from "express";
import { wrapAsync } from "../../utils/wrapAsync";
import * as service from "./views.service";

export const getDashboard = wrapAsync(async (req: Request, res: Response) => {
  const result = await service.getDashboard(req.userId);
  res.json(result);
});

export const addBlock = wrapAsync(async (req: Request, res: Response) => {
  const block = await service.addBlock(req.userId, req.params.dashboardId, {
    view_type: req.body.view_type,
    title: req.body.title,
    row: req.body.row,
    column: req.body.column,
    config: req.body.config,
  });
  res.status(201).json(block);
});

export const removeBlock = wrapAsync(async (req: Request, res: Response) => {
  await service.removeBlock(req.userId, req.params.blockId);
  res.status(204).send();
});

export const updateBlock = wrapAsync(async (req: Request, res: Response) => {
  const block = await service.updateBlock(req.userId, req.params.blockId, {
    view_type: req.body.view_type,
    title: req.body.title,
    row: req.body.row,
    column: req.body.column,
    config: req.body.config,
  });
  res.json(block);
});

export const reorderBlocks = wrapAsync(async (req: Request, res: Response) => {
  await service.reorderBlocks(req.userId, req.body.positions);
  res.status(204).send();
});
