import { Router } from 'express';
import * as ctrl from './relationships.controller';

export const relationshipsRouter = Router();

// Tag CRUD
relationshipsRouter.get('/',            ctrl.getAllTags);
relationshipsRouter.get('/usage',       ctrl.getTagUsageCounts);
relationshipsRouter.post('/',           ctrl.createTag);
relationshipsRouter.patch('/:id',       ctrl.renameTag);
relationshipsRouter.delete('/:id',      ctrl.deleteTag);
relationshipsRouter.get('/:id/items',   ctrl.getItemsForTag);

// Item-tag associations (also reachable via /api/items/:itemId/tags/:tagId)
relationshipsRouter.get('/item/:itemId',              ctrl.getTagsForItem);
relationshipsRouter.post('/item/:itemId/:tagId',      ctrl.tagItem);
relationshipsRouter.delete('/item/:itemId/:tagId',    ctrl.untagItem);
