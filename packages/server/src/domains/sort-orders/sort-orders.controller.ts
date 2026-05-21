import { Request, Response } from "express";
import { wrapAsync } from "../../utils/wrapAsync";
import * as service from "./sort-orders.service";

export const getSortOrders = wrapAsync(async (req: Request, res: Response) => {
  const contextKey = req.query.context as string;
  const rows = await service.getSortOrders(req.userId, contextKey);
  res.json(rows);
});

export const saveSortOrders = wrapAsync(async (req: Request, res: Response) => {
  const { context_key, item_ids } = req.body as {
    context_key: string;
    item_ids: string[];
  };
  await service.saveSortOrders(req.userId, context_key, item_ids);
  res.status(204).send();
});
