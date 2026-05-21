import { Router } from 'express';
import * as ctrl from './views.controller';

export const viewsRouter = Router();

viewsRouter.get('/',                               ctrl.getDashboard);
viewsRouter.post('/:dashboardId/blocks',           ctrl.addBlock);
viewsRouter.patch('/blocks/:blockId',              ctrl.updateBlock);
viewsRouter.delete('/blocks/:blockId',             ctrl.removeBlock);
viewsRouter.put('/blocks/reorder',                 ctrl.reorderBlocks);
