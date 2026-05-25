import { Router } from "express";
import express from "express";
import * as controller from "./billing.controller";
import { requireAuth } from "../../middleware/auth";

export const billingRouter = Router();

// Webhook must receive raw body — mount before json parser
billingRouter.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  controller.webhook,
);

billingRouter.post("/checkout", requireAuth, controller.checkout);
billingRouter.post("/portal", requireAuth, controller.portal);
