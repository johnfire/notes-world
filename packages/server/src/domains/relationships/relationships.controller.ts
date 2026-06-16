import { Request, Response } from "express";
import { PAGINATION } from "../../constants";
import { wrapAsync } from "../../utils/wrapAsync";
import * as service from "./relationships.service";

export const createTag = wrapAsync(async (req: Request, res: Response) => {
  const tag = await service.createTag(req.userId, req.body.name);
  res.status(201).json(tag);
});

export const renameTag = wrapAsync(async (req: Request, res: Response) => {
  const tag = await service.renameTag(
    req.userId,
    req.params.id,
    req.body.new_name,
  );
  res.json(tag);
});

export const updateTagColor = wrapAsync(async (req: Request, res: Response) => {
  const tag = await service.updateTagColor(
    req.userId,
    req.params.id,
    req.body.color ?? null,
  );
  res.json(tag);
});

export const deleteTag = wrapAsync(async (req: Request, res: Response) => {
  const deleteItems = req.query.deleteItems === "true";
  await service.deleteTag(req.userId, req.params.id, deleteItems);
  res.status(204).send();
});

export const getAllTags = wrapAsync(async (req: Request, res: Response) => {
  const tags = await service.getAllTags(req.userId);
  res.json(tags);
});

export const getTagUsageCounts = wrapAsync(
  async (req: Request, res: Response) => {
    const tags = await service.getTagUsageCounts(req.userId);
    res.json(tags);
  },
);

export const getTagsForItem = wrapAsync(async (req: Request, res: Response) => {
  const tags = await service.getTagsForItem(req.userId, req.params.itemId);
  res.json(tags);
});

export const getItemsForTag = wrapAsync(async (req: Request, res: Response) => {
  const limit = Math.min(
    PAGINATION.MAX_PAGE_SIZE,
    Math.max(1, Number(req.query.limit ?? 50) || 50),
  );
  const offset = Math.max(0, Number(req.query.offset ?? 0) || 0);
  const items = await service.getItemsForTag(
    req.userId,
    req.params.id,
    limit,
    offset,
  );
  res.json(items);
});

export const getTagsForItems = wrapAsync(
  async (req: Request, res: Response) => {
    const ids = String(req.query.ids ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const result = await service.getTagsForItems(req.userId, ids);
    res.json(result);
  },
);

export const tagItem = wrapAsync(async (req: Request, res: Response) => {
  await service.tagItem(req.userId, req.params.itemId, req.params.tagId);
  res.status(204).send();
});

export const untagItem = wrapAsync(async (req: Request, res: Response) => {
  await service.untagItem(req.userId, req.params.itemId, req.params.tagId);
  res.status(204).send();
});
