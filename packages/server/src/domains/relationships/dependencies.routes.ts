import { Router, Request, Response } from "express";
import { wrapAsync } from "../../utils/wrapAsync";
import * as service from "./dependencies.service";

export const dependenciesRouter = Router();

dependenciesRouter.post(
  "/items/:dependentId/dependencies",
  wrapAsync(async (req: Request, res: Response) => {
    const dep = await service.addDependency(
      req.userId,
      req.params.dependentId,
      req.body.dependency_id,
    );
    res.status(201).json(dep);
  }),
);

dependenciesRouter.delete(
  "/dependencies/:id",
  wrapAsync(async (req: Request, res: Response) => {
    await service.removeDependency(req.userId, req.params.id);
    res.status(204).send();
  }),
);

dependenciesRouter.get(
  "/items/:itemId/dependencies",
  wrapAsync(async (req: Request, res: Response) => {
    const deps = await service.getDependenciesForItem(
      req.userId,
      req.params.itemId,
    );
    res.json(deps);
  }),
);

dependenciesRouter.get(
  "/items/:itemId/dependents",
  wrapAsync(async (req: Request, res: Response) => {
    const deps = await service.getDependentsOfItem(
      req.userId,
      req.params.itemId,
    );
    res.json(deps);
  }),
);

dependenciesRouter.get(
  "/items/:itemId/dependency-chain",
  wrapAsync(async (req: Request, res: Response) => {
    const chain = await service.getDependencyChain(
      req.userId,
      req.params.itemId,
    );
    res.json(chain);
  }),
);

dependenciesRouter.post(
  "/items/:itemId/cross-references",
  wrapAsync(async (req: Request, res: Response) => {
    await service.addCrossReference(
      req.userId,
      req.params.itemId,
      req.body.item_b_id,
    );
    res.status(204).send();
  }),
);

dependenciesRouter.delete(
  "/cross-references/:id",
  wrapAsync(async (req: Request, res: Response) => {
    await service.removeCrossReference(req.userId, req.params.id);
    res.status(204).send();
  }),
);

dependenciesRouter.get(
  "/items/:itemId/cross-references",
  wrapAsync(async (req: Request, res: Response) => {
    const items = await service.getCrossReferences(
      req.userId,
      req.params.itemId,
    );
    res.json(items);
  }),
);
