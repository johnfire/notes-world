import { Request, Response } from "express";
import { wrapAsync } from "../../utils/wrapAsync";
import * as service from "./auth.service";

const REFRESH_COOKIE = "refresh_token";
const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  maxAge: 30 * 24 * 60 * 60 * 1000,
  path: "/api/auth",
};

export const register = wrapAsync(async (req: Request, res: Response) => {
  const { user, tokens, rawRefreshToken } = await service.register({
    email: req.body.email,
    password: req.body.password,
  });
  res.cookie(REFRESH_COOKIE, rawRefreshToken, COOKIE_OPTS);
  res.status(201).json({ user, ...tokens });
});

export const login = wrapAsync(async (req: Request, res: Response) => {
  const { user, tokens, rawRefreshToken } = await service.login({
    email: req.body.email,
    password: req.body.password,
  });
  res.cookie(REFRESH_COOKIE, rawRefreshToken, COOKIE_OPTS);
  res.json({ user, ...tokens });
});

export const refresh = wrapAsync(async (req: Request, res: Response) => {
  const raw = req.cookies?.[REFRESH_COOKIE];
  const { tokens, rawRefreshToken } = await service.refresh(raw);
  res.cookie(REFRESH_COOKIE, rawRefreshToken, COOKIE_OPTS);
  res.json(tokens);
});

export const logout = wrapAsync(async (req: Request, res: Response) => {
  const raw = req.cookies?.[REFRESH_COOKIE];
  await service.logout(raw);
  res.clearCookie(REFRESH_COOKIE, { path: "/api/auth" });
  res.status(204).end();
});
