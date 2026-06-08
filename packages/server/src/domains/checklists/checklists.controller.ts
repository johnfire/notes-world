import { Request, Response } from "express";
import { wrapAsync } from "../../utils/wrapAsync";
import * as service from "./checklists.service";

export const listChecklists = wrapAsync(async (req: Request, res: Response) => {
  const checklists = await service.listChecklists(req.userId);
  res.json(checklists);
});

export const getChecklist = wrapAsync(async (req: Request, res: Response) => {
  const checklist = await service.getChecklist(req.userId, req.params.id);
  res.json(checklist);
});

export const createChecklist = wrapAsync(
  async (req: Request, res: Response) => {
    const checklist = await service.createChecklist(req.userId, req.body.title);
    res.status(201).json(checklist);
  },
);

export const renameChecklist = wrapAsync(
  async (req: Request, res: Response) => {
    const checklist = await service.renameChecklist(
      req.userId,
      req.params.id,
      req.body.title,
    );
    res.json(checklist);
  },
);

export const deleteChecklist = wrapAsync(
  async (req: Request, res: Response) => {
    await service.deleteChecklist(req.userId, req.params.id);
    res.status(204).send();
  },
);

export const addItem = wrapAsync(async (req: Request, res: Response) => {
  const item = await service.addItem(req.userId, req.params.id, req.body.name);
  res.status(201).json(item);
});

export const updateItem = wrapAsync(async (req: Request, res: Response) => {
  const item = await service.updateItem(
    req.userId,
    req.params.id,
    req.params.itemId,
    { name: req.body.name, checked: req.body.checked },
  );
  res.json(item);
});

export const deleteItem = wrapAsync(async (req: Request, res: Response) => {
  await service.deleteItem(req.userId, req.params.id, req.params.itemId);
  res.status(204).send();
});
