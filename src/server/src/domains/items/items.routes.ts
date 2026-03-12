import { Router } from 'express';
import * as ctrl from './items.controller';

export const itemsRouter = Router();

// Queries
itemsRouter.get('/search',           ctrl.searchItems);
itemsRouter.get('/recent',           ctrl.getRecentItems);
itemsRouter.get('/type/:type',       ctrl.getItemsByType);
itemsRouter.get('/:id',              ctrl.getItemById);

// Commands
itemsRouter.post('/',                ctrl.captureItem);
itemsRouter.patch('/:id',            ctrl.updateItem);
itemsRouter.post('/:id/promote',     ctrl.promoteItem);
itemsRouter.post('/:id/archive',     ctrl.archiveItem);
itemsRouter.post('/:id/restore',     ctrl.restoreItem);
