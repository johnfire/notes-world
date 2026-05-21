import { Router } from 'express';
import * as ctrl from './sort-orders.controller';

export const sortOrdersRouter = Router();

sortOrdersRouter.get('/',  ctrl.getSortOrders);
sortOrdersRouter.put('/',  ctrl.saveSortOrders);
