import { Router } from "express";
import * as controller from "./admin.controller";
import { requireAdmin } from "../../middleware/admin";

export const adminRouter = Router();

adminRouter.get("/users", requireAdmin, controller.listUsers);
adminRouter.put("/users/:id/role", requireAdmin, controller.updateUserRole);
