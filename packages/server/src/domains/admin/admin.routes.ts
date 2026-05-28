import { Router } from "express";
import * as controller from "./admin.controller";
import { requireAdmin } from "../../middleware/admin";

export const adminRouter = Router();

adminRouter.post("/users", requireAdmin, controller.createUser);
adminRouter.get("/users", requireAdmin, controller.listUsers);
adminRouter.put("/users/:id/role", requireAdmin, controller.updateUserRole);

adminRouter.get("/coupons", requireAdmin, controller.listCoupons);
adminRouter.post("/coupons", requireAdmin, controller.createCoupon);
adminRouter.patch("/coupons/:code", requireAdmin, controller.updateCoupon);
adminRouter.delete("/coupons/:code", requireAdmin, controller.deleteCoupon);
