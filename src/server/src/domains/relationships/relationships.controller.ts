import { Request, Response } from 'express';
import { PHASE1_USER_ID } from '../../constants';
import { wrapAsync } from '../../utils/wrapAsync';
import * as service from './relationships.service';

export const createTag = wrapAsync(async (req: Request, res: Response) => {
  const tag = await service.createTag(PHASE1_USER_ID, req.body.name);
  res.status(201).json(tag);
});

export const renameTag = wrapAsync(async (req: Request, res: Response) => {
  const tag = await service.renameTag(PHASE1_USER_ID, req.params.id, req.body.new_name);
  res.json(tag);
});

export const updateTagColor = wrapAsync(async (req: Request, res: Response) => {
  const tag = await service.updateTagColor(PHASE1_USER_ID, req.params.id, req.body.color ?? null);
  res.json(tag);
});

export const deleteTag = wrapAsync(async (_req: Request, res: Response) => {
  await service.deleteTag(PHASE1_USER_ID, _req.params.id);
  res.status(204).send();
});

export const getAllTags = wrapAsync(async (_req: Request, res: Response) => {
  const tags = await service.getAllTags(PHASE1_USER_ID);
  res.json(tags);
});

export const getTagUsageCounts = wrapAsync(async (_req: Request, res: Response) => {
  const tags = await service.getTagUsageCounts(PHASE1_USER_ID);
  res.json(tags);
});

export const getTagsForItem = wrapAsync(async (req: Request, res: Response) => {
  const tags = await service.getTagsForItem(PHASE1_USER_ID, req.params.itemId);
  res.json(tags);
});

export const getItemsForTag = wrapAsync(async (req: Request, res: Response) => {
  const limit  = Number(req.query.limit  ?? 50);
  const offset = Number(req.query.offset ?? 0);
  const items  = await service.getItemsForTag(PHASE1_USER_ID, req.params.id, limit, offset);
  res.json(items);
});

export const getTagsForItems = wrapAsync(async (req: Request, res: Response) => {
  const ids = String(req.query.ids ?? '').split(',').map(s => s.trim()).filter(Boolean);
  const result = await service.getTagsForItems(PHASE1_USER_ID, ids);
  res.json(result);
});

export const tagItem = wrapAsync(async (req: Request, res: Response) => {
  await service.tagItem(PHASE1_USER_ID, req.params.itemId, req.params.tagId);
  res.status(204).send();
});

export const untagItem = wrapAsync(async (req: Request, res: Response) => {
  await service.untagItem(PHASE1_USER_ID, req.params.itemId, req.params.tagId);
  res.status(204).send();
});
