import { Request, Response, NextFunction } from 'express';
import { PHASE1_USER_ID, PAGINATION } from '../../constants';
import { ItemType } from '../../types';
import * as service from './items.service';

export async function captureItem(req: Request, res: Response, next: NextFunction) {
  try {
    const item = await service.captureItem(PHASE1_USER_ID, {
      title: req.body.title,
      body:  req.body.body,
    });
    res.status(201).json(item);
  } catch (err) { next(err); }
}

export async function getItemById(req: Request, res: Response, next: NextFunction) {
  try {
    const item = await service.getItemById(PHASE1_USER_ID, req.params.id);
    res.json(item);
  } catch (err) { next(err); }
}

export async function updateItem(req: Request, res: Response, next: NextFunction) {
  try {
    const item = await service.updateItem(PHASE1_USER_ID, req.params.id, {
      title:     req.body.title,
      body:      req.body.body,
      type_data: req.body.type_data,
    });
    res.json(item);
  } catch (err) { next(err); }
}

export async function promoteItem(req: Request, res: Response, next: NextFunction) {
  try {
    const item = await service.promoteItem(PHASE1_USER_ID, req.params.id, {
      new_type:  req.body.new_type,
      type_data: req.body.type_data,
    });
    res.json(item);
  } catch (err) { next(err); }
}

export async function archiveItem(req: Request, res: Response, next: NextFunction) {
  try {
    const item = await service.archiveItem(PHASE1_USER_ID, req.params.id);
    res.json(item);
  } catch (err) { next(err); }
}

export async function restoreItem(req: Request, res: Response, next: NextFunction) {
  try {
    const item = await service.restoreItem(PHASE1_USER_ID, req.params.id);
    res.json(item);
  } catch (err) { next(err); }
}

export async function completeTask(req: Request, res: Response, next: NextFunction) {
  try {
    const item = await service.completeTask(PHASE1_USER_ID, req.params.id);
    res.json(item);
  } catch (err) { next(err); }
}

export async function startTask(req: Request, res: Response, next: NextFunction) {
  try {
    const item = await service.startTask(PHASE1_USER_ID, req.params.id);
    res.json(item);
  } catch (err) { next(err); }
}

export async function blockTask(req: Request, res: Response, next: NextFunction) {
  try {
    const item = await service.blockTask(PHASE1_USER_ID, req.params.id);
    res.json(item);
  } catch (err) { next(err); }
}

export async function getRecentItems(req: Request, res: Response, next: NextFunction) {
  try {
    const limit = Math.min(Number(req.query.limit ?? 20), PAGINATION.MAX_PAGE_SIZE);
    const items = await service.getRecentItems(PHASE1_USER_ID, limit);
    res.json(items);
  } catch (err) { next(err); }
}

export async function searchItems(req: Request, res: Response, next: NextFunction) {
  try {
    const q      = String(req.query.q ?? '');
    const limit  = Number(req.query.limit  ?? 50);
    const offset = Number(req.query.offset ?? 0);
    const items  = await service.searchItems(PHASE1_USER_ID, q, limit, offset);
    res.json(items);
  } catch (err) { next(err); }
}

export async function getItemsByType(req: Request, res: Response, next: NextFunction) {
  try {
    const itemType = req.params.type as ItemType;
    const limit    = Number(req.query.limit  ?? 50);
    const offset   = Number(req.query.offset ?? 0);
    const items    = await service.getItemsByType(PHASE1_USER_ID, itemType, limit, offset);
    res.json(items);
  } catch (err) { next(err); }
}
