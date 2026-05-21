import { Request, Response } from "express";
import { PAGINATION } from "../../constants";
import { ItemType } from "../../types";
import { wrapAsync } from "../../utils/wrapAsync";
import * as service from "./items.service";

export const captureItem = wrapAsync(async (req: Request, res: Response) => {
  const item = await service.captureItem(req.userId, {
    title: req.body.title,
    body: req.body.body,
  });
  res.status(201).json(item);
});

export const getItemById = wrapAsync(async (req: Request, res: Response) => {
  const item = await service.getItemById(req.userId, req.params.id);
  res.json(item);
});

export const updateItem = wrapAsync(async (req: Request, res: Response) => {
  const item = await service.updateItem(req.userId, req.params.id, {
    title: req.body.title,
    body: req.body.body,
    type_data: req.body.type_data,
    color: req.body.color,
  });
  res.json(item);
});

export const promoteItem = wrapAsync(async (req: Request, res: Response) => {
  const item = await service.promoteItem(req.userId, req.params.id, {
    new_type: req.body.new_type,
    type_data: req.body.type_data,
  });
  res.json(item);
});

export const archiveItem = wrapAsync(async (req: Request, res: Response) => {
  const item = await service.archiveItem(req.userId, req.params.id);
  res.json(item);
});

export const restoreItem = wrapAsync(async (req: Request, res: Response) => {
  const item = await service.restoreItem(req.userId, req.params.id);
  res.json(item);
});

export const completeTask = wrapAsync(async (req: Request, res: Response) => {
  const item = await service.completeTask(req.userId, req.params.id);
  res.json(item);
});

export const startTask = wrapAsync(async (req: Request, res: Response) => {
  const item = await service.startTask(req.userId, req.params.id);
  res.json(item);
});

export const blockTask = wrapAsync(async (req: Request, res: Response) => {
  const item = await service.blockTask(req.userId, req.params.id);
  res.json(item);
});

export const getRecentItems = wrapAsync(async (req: Request, res: Response) => {
  const limit = Math.min(
    Number(req.query.limit ?? 20),
    PAGINATION.MAX_PAGE_SIZE,
  );
  const items = await service.getRecentItems(req.userId, limit);
  res.json(items);
});

export const searchItems = wrapAsync(async (req: Request, res: Response) => {
  const q = String(req.query.q ?? "");
  const limit = Number(req.query.limit ?? 50);
  const offset = Number(req.query.offset ?? 0);
  const items = await service.searchItems(req.userId, q, limit, offset);
  res.json(items);
});

export const getItemsByType = wrapAsync(async (req: Request, res: Response) => {
  const itemType = req.params.type as ItemType;
  const limit = Number(req.query.limit ?? 50);
  const offset = Number(req.query.offset ?? 0);
  const items = await service.getItemsByType(
    req.userId,
    itemType,
    limit,
    offset,
  );
  res.json(items);
});

export const getByEntryType = wrapAsync(async (req: Request, res: Response) => {
  const entryType = req.params.entryType;
  const limit = Number(req.query.limit ?? 50);
  const offset = Number(req.query.offset ?? 0);
  const items = await service.getItemsByEntryType(
    req.userId,
    entryType,
    limit,
    offset,
  );
  res.json(items);
});

export const getTrash = wrapAsync(async (req: Request, res: Response) => {
  const limit = Number(req.query.limit ?? 50);
  const offset = Number(req.query.offset ?? 0);
  const items = await service.getTrash(req.userId, limit, offset);
  res.json(items);
});

export const purgeItem = wrapAsync(async (req: Request, res: Response) => {
  await service.purgeItem(req.userId, req.params.id);
  res.status(204).send();
});

export const purgeExpired = wrapAsync(async (req: Request, res: Response) => {
  const count = await service.purgeExpired(req.userId);
  res.json({ purged: count });
});

export const createDivider = wrapAsync(async (req: Request, res: Response) => {
  const item = await service.createDivider(req.userId);
  res.status(201).json(item);
});
