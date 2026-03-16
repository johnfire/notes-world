import { Router } from 'express';
import * as ctrl from './export.controller';

export const exportRouter = Router();

exportRouter.get('/tag/:tagId', ctrl.exportTag);
exportRouter.get('/untagged',   ctrl.exportUntagged);
