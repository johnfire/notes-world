import { Router } from 'express';
import * as ctrl from './items.controller';

export const itemsRouter = Router();

// Queries
itemsRouter.get('/search',           ctrl.searchItems);
itemsRouter.get('/recent',           ctrl.getRecentItems);
itemsRouter.get('/trash',            ctrl.getTrash);
itemsRouter.get('/type/:type',       ctrl.getItemsByType);
itemsRouter.get('/entry/:entryType', ctrl.getByEntryType);
itemsRouter.get('/:id',              ctrl.getItemById);

// Commands
itemsRouter.post('/divider',         ctrl.createDivider);
itemsRouter.post('/purge-expired',   ctrl.purgeExpired);
itemsRouter.post('/',                ctrl.captureItem);
itemsRouter.patch('/:id',            ctrl.updateItem);
itemsRouter.post('/:id/promote',     ctrl.promoteItem);
itemsRouter.post('/:id/archive',     ctrl.archiveItem);
itemsRouter.post('/:id/restore',     ctrl.restoreItem);
itemsRouter.post('/:id/purge',       ctrl.purgeItem);
itemsRouter.post('/:id/complete',    ctrl.completeTask);
itemsRouter.post('/:id/start',       ctrl.startTask);
itemsRouter.post('/:id/block',       ctrl.blockTask);
