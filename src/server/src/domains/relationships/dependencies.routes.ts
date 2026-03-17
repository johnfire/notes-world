import { Router, Request, Response } from 'express';
import { PHASE1_USER_ID } from '../../constants';
import { wrapAsync } from '../../utils/wrapAsync';
import * as service from './dependencies.service';

export const dependenciesRouter = Router();

dependenciesRouter.post('/items/:dependentId/dependencies', wrapAsync(async (req: Request, res: Response) => {
  const dep = await service.addDependency(PHASE1_USER_ID, req.params.dependentId, req.body.dependency_id);
  res.status(201).json(dep);
}));

dependenciesRouter.delete('/dependencies/:id', wrapAsync(async (req: Request, res: Response) => {
  await service.removeDependency(PHASE1_USER_ID, req.params.id);
  res.status(204).send();
}));

dependenciesRouter.get('/items/:itemId/dependencies', wrapAsync(async (req: Request, res: Response) => {
  const deps = await service.getDependenciesForItem(PHASE1_USER_ID, req.params.itemId);
  res.json(deps);
}));

dependenciesRouter.get('/items/:itemId/dependents', wrapAsync(async (req: Request, res: Response) => {
  const deps = await service.getDependentsOfItem(PHASE1_USER_ID, req.params.itemId);
  res.json(deps);
}));

dependenciesRouter.get('/items/:itemId/dependency-chain', wrapAsync(async (req: Request, res: Response) => {
  const chain = await service.getDependencyChain(PHASE1_USER_ID, req.params.itemId);
  res.json(chain);
}));

dependenciesRouter.post('/items/:itemId/cross-references', wrapAsync(async (req: Request, res: Response) => {
  await service.addCrossReference(PHASE1_USER_ID, req.params.itemId, req.body.item_b_id);
  res.status(204).send();
}));

dependenciesRouter.delete('/cross-references/:id', wrapAsync(async (req: Request, res: Response) => {
  await service.removeCrossReference(PHASE1_USER_ID, req.params.id);
  res.status(204).send();
}));

dependenciesRouter.get('/items/:itemId/cross-references', wrapAsync(async (req: Request, res: Response) => {
  const items = await service.getCrossReferences(PHASE1_USER_ID, req.params.itemId);
  res.json(items);
}));
