import { Router } from 'express';
import * as ctrl from './relationships.controller';

export const relationshipsRouter = Router();

// Tag CRUD — specific routes must come before /:id
relationshipsRouter.get('/',              ctrl.getAllTags);
relationshipsRouter.get('/usage',         ctrl.getTagUsageCounts);
relationshipsRouter.get('/items/batch',   ctrl.getTagsForItems);
relationshipsRouter.post('/',             ctrl.createTag);
relationshipsRouter.patch('/:id',         ctrl.renameTag);
relationshipsRouter.delete('/:id',        ctrl.deleteTag);
relationshipsRouter.get('/:id/items',     ctrl.getItemsForTag);

// Item-tag associations
relationshipsRouter.get('/item/:itemId',              ctrl.getTagsForItem);
relationshipsRouter.post('/item/:itemId/:tagId',       ctrl.tagItem);
relationshipsRouter.delete('/item/:itemId/:tagId',     ctrl.untagItem);
