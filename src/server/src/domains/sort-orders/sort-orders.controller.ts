import { Request, Response, NextFunction } from 'express';
import { PHASE1_USER_ID } from '../../constants';
import * as service from './sort-orders.service';

export async function getSortOrders(req: Request, res: Response, next: NextFunction) {
  try {
    const contextKey = req.query.context as string;
    const rows = await service.getSortOrders(PHASE1_USER_ID, contextKey);
    res.json(rows);
  } catch (err) { next(err); }
}

export async function saveSortOrders(req: Request, res: Response, next: NextFunction) {
  try {
    const { context_key, item_ids } = req.body as { context_key: string; item_ids: string[] };
    await service.saveSortOrders(PHASE1_USER_ID, context_key, item_ids);
    res.status(204).send();
  } catch (err) { next(err); }
}
