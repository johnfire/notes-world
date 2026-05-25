import { Request, Response } from "express";
import { wrapAsync } from "../../utils/wrapAsync";
import * as service from "./billing.service";
import * as authRepo from "../auth/auth.repository";

export const checkout = wrapAsync(async (req: Request, res: Response) => {
  const user = await authRepo.findUserById(req.userId!);
  if (!user) {
    res.status(401).json({ message: "User not found" });
    return;
  }
  const plan = req.body.plan === "annual" ? "annual" : "monthly";
  const url = await service.createCheckoutSession(user, plan);
  res.json({ url });
});

export const portal = wrapAsync(async (req: Request, res: Response) => {
  const user = await authRepo.findUserById(req.userId!);
  if (!user) {
    res.status(401).json({ message: "User not found" });
    return;
  }
  const url = await service.createPortalSession(user);
  res.json({ url });
});

export const webhook = async (req: Request, res: Response): Promise<void> => {
  const sig = req.headers["stripe-signature"] as string;
  try {
    await service.handleWebhook(req.body as Buffer, sig);
    res.json({ received: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Webhook error";
    res.status(400).json({ message: msg });
  }
};
