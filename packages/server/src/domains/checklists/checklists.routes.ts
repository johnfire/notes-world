import { Router } from "express";
import * as ctrl from "./checklists.controller";

export const checklistsRouter = Router();

checklistsRouter.get("/", ctrl.listChecklists);
checklistsRouter.post("/", ctrl.createChecklist);
checklistsRouter.get("/:id", ctrl.getChecklist);
checklistsRouter.patch("/:id", ctrl.renameChecklist);
checklistsRouter.delete("/:id", ctrl.deleteChecklist);
checklistsRouter.post("/:id/items", ctrl.addItem);
checklistsRouter.patch("/:id/items/:itemId", ctrl.updateItem);
checklistsRouter.delete("/:id/items/:itemId", ctrl.deleteItem);
