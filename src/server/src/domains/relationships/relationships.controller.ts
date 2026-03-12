import { Request, Response, NextFunction } from 'express';
import { PHASE1_USER_ID } from '../../constants';
import * as service from './relationships.service';

export async function createTag(req: Request, res: Response, next: NextFunction) {
  try {
    const tag = await service.createTag(PHASE1_USER_ID, req.body.name);
    res.status(201).json(tag);
  } catch (err) { next(err); }
}

export async function renameTag(req: Request, res: Response, next: NextFunction) {
  try {
    const tag = await service.renameTag(PHASE1_USER_ID, req.params.id, req.body.new_name);
    res.json(tag);
  } catch (err) { next(err); }
}

export async function deleteTag(req: Request, res: Response, next: NextFunction) {
  try {
    await service.deleteTag(PHASE1_USER_ID, req.params.id);
    res.status(204).send();
  } catch (err) { next(err); }
}

export async function getAllTags(req: Request, res: Response, next: NextFunction) {
  try {
    const tags = await service.getAllTags(PHASE1_USER_ID);
    res.json(tags);
  } catch (err) { next(err); }
}

export async function getTagUsageCounts(req: Request, res: Response, next: NextFunction) {
  try {
    const tags = await service.getTagUsageCounts(PHASE1_USER_ID);
    res.json(tags);
  } catch (err) { next(err); }
}

export async function getTagsForItem(req: Request, res: Response, next: NextFunction) {
  try {
    const tags = await service.getTagsForItem(PHASE1_USER_ID, req.params.itemId);
    res.json(tags);
  } catch (err) { next(err); }
}

export async function getItemsForTag(req: Request, res: Response, next: NextFunction) {
  try {
    const limit  = Number(req.query.limit  ?? 50);
    const offset = Number(req.query.offset ?? 0);
    const items  = await service.getItemsForTag(PHASE1_USER_ID, req.params.id, limit, offset);
    res.json(items);
  } catch (err) { next(err); }
}

export async function tagItem(req: Request, res: Response, next: NextFunction) {
  try {
    await service.tagItem(PHASE1_USER_ID, req.params.itemId, req.params.tagId);
    res.status(204).send();
  } catch (err) { next(err); }
}

export async function untagItem(req: Request, res: Response, next: NextFunction) {
  try {
    await service.untagItem(PHASE1_USER_ID, req.params.itemId, req.params.tagId);
    res.status(204).send();
  } catch (err) { next(err); }
}
