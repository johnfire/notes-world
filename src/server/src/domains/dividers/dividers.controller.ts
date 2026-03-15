import { Request, Response, NextFunction } from 'express';
import { PHASE1_USER_ID } from '../../constants';
import * as service from './dividers.service';

export async function listDividers(req: Request, res: Response, next: NextFunction) {
  try {
    const dividers = await service.listDividers(PHASE1_USER_ID);
    res.json(dividers);
  } catch (err) { next(err); }
}

export async function createDivider(req: Request, res: Response, next: NextFunction) {
  try {
    const { label } = req.body as { label?: string | null };
    const divider = await service.createDivider(PHASE1_USER_ID, label);
    res.status(201).json(divider);
  } catch (err) { next(err); }
}

export async function updateDivider(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { label } = req.body as { label: string | null };
    const divider = await service.updateDivider(PHASE1_USER_ID, id, label ?? null);
    res.json(divider);
  } catch (err) { next(err); }
}

export async function deleteDivider(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    await service.deleteDivider(PHASE1_USER_ID, id);
    res.status(204).send();
  } catch (err) { next(err); }
}
