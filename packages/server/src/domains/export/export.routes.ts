import { Router } from "express";
import * as ctrl from "./export.controller";

export const exportRouter = Router();

exportRouter.get("/all", ctrl.exportAll);
exportRouter.get("/json", ctrl.exportJson);
exportRouter.get("/csv", ctrl.exportCsv);
exportRouter.get("/tag/:tagId", ctrl.exportTag);
exportRouter.get("/untagged", ctrl.exportUntagged);
