import { Router, Request, Response, NextFunction } from 'express';
import { PHASE1_USER_ID } from '../../constants';
import * as service from './dependencies.service';

export const dependenciesRouter = Router();

dependenciesRouter.post('/items/:dependentId/dependencies', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dep = await service.addDependency(PHASE1_USER_ID, req.params.dependentId, req.body.dependency_id);
    res.status(201).json(dep);
  } catch (err) { next(err); }
});

dependenciesRouter.delete('/dependencies/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await service.removeDependency(PHASE1_USER_ID, req.params.id);
    res.status(204).send();
  } catch (err) { next(err); }
});

dependenciesRouter.get('/items/:itemId/dependencies', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deps = await service.getDependenciesForItem(PHASE1_USER_ID, req.params.itemId);
    res.json(deps);
  } catch (err) { next(err); }
});

dependenciesRouter.get('/items/:itemId/dependents', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deps = await service.getDependentsOfItem(PHASE1_USER_ID, req.params.itemId);
    res.json(deps);
  } catch (err) { next(err); }
});

dependenciesRouter.get('/items/:itemId/dependency-chain', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const chain = await service.getDependencyChain(PHASE1_USER_ID, req.params.itemId);
    res.json(chain);
  } catch (err) { next(err); }
});

dependenciesRouter.post('/items/:itemId/cross-references', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await service.addCrossReference(PHASE1_USER_ID, req.params.itemId, req.body.item_b_id);
    res.status(204).send();
  } catch (err) { next(err); }
});

dependenciesRouter.delete('/cross-references/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await service.removeCrossReference(PHASE1_USER_ID, req.params.id);
    res.status(204).send();
  } catch (err) { next(err); }
});

dependenciesRouter.get('/items/:itemId/cross-references', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const items = await service.getCrossReferences(PHASE1_USER_ID, req.params.itemId);
    res.json(items);
  } catch (err) { next(err); }
});
