import { Router } from "express";
import * as controller from "./auth.controller";
import { requireAuth } from "../../middleware/auth";

export const authRouter = Router();

authRouter.post("/register", controller.register);
authRouter.post("/login", controller.login);
authRouter.post("/refresh", controller.refresh);
authRouter.post("/logout", controller.logout);

// Protected account management routes
authRouter.get("/me", requireAuth, controller.getMe);
authRouter.put("/me/password", requireAuth, controller.changePassword);
authRouter.put("/me/email", requireAuth, controller.changeEmail);
authRouter.delete("/me", requireAuth, controller.deleteAccount);

// API key management
authRouter.post("/api-keys", requireAuth, controller.createApiKey);
authRouter.get("/api-keys", requireAuth, controller.listApiKeys);
authRouter.delete("/api-keys/:prefix", requireAuth, controller.deleteApiKey);
