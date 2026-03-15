import { Router } from 'express';
import * as ctrl from './dividers.controller';

export const dividersRouter = Router();

dividersRouter.get('/',    ctrl.listDividers);
dividersRouter.post('/',   ctrl.createDivider);
dividersRouter.patch('/:id', ctrl.updateDivider);
dividersRouter.delete('/:id', ctrl.deleteDivider);
