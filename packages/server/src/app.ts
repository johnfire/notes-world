import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import path from "path";
import { itemsRouter } from "./domains/items/items.routes";
import { relationshipsRouter } from "./domains/relationships/relationships.routes";
import { dependenciesRouter } from "./domains/relationships/dependencies.routes";
import { viewsRouter } from "./domains/views/views.routes";
import { importRouter } from "./domains/import/import.routes";
import { sortOrdersRouter } from "./domains/sort-orders/sort-orders.routes";
import { exportRouter } from "./domains/export/export.routes";
import { authRouter } from "./domains/auth/auth.routes";
import { billingRouter } from "./domains/billing/billing.routes";
import { adminRouter } from "./domains/admin/admin.routes";
import { requireAuth } from "./middleware/auth";
import { errorHandler } from "./middleware/errorHandler";

// Tracked separately so tests (which don't go through server.ts) still work
let startedAt = new Date();
export function setStartedAt(date: Date) {
  startedAt = date;
}

const VERSION = process.env.npm_package_version ?? "0.1.0";

export function createApp() {
  const app = express();

  // Trust the first proxy (Apache) so express-rate-limit reads X-Forwarded-For correctly
  app.set("trust proxy", 1);

  app.use(
    helmet({ contentSecurityPolicy: process.env.NODE_ENV === "production" }),
  );
  app.use(cors({ origin: process.env.CORS_ORIGIN ?? true, credentials: true }));
  app.use(express.json({ limit: "10mb" }));
  app.use(cookieParser());

  // Rate limit API routes — 200 requests per minute per IP
  if (process.env.NODE_ENV !== "test") {
    app.use(morgan("dev"));
    app.use(
      "/api",
      rateLimit({
        windowMs: 60_000,
        limit: 200,
        standardHeaders: "draft-7",
        legacyHeaders: false,
      }),
    );
  }

  // Health check — not rate-limited
  app.get("/health", (_req, res) => {
    const uptime = Math.floor((Date.now() - startedAt.getTime()) / 1000);
    res.json({
      status: "ok",
      version: VERSION,
      uptime,
      timestamp: new Date().toISOString(),
    });
  });

  // Disable ETag caching for API routes — stale 304s break refresh after mutations
  app.use("/api", (_req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });

  // Auth routes — no JWT required
  app.use("/api/auth", authRouter);

  // Billing webhook — no JWT required (Stripe signs its own requests)
  app.use("/api/billing", billingRouter);

  // All routes below this line require a valid JWT
  app.use("/api", requireAuth);

  app.use("/api/items", itemsRouter);
  app.use("/api/tags", relationshipsRouter);
  app.use("/api", dependenciesRouter);
  app.use("/api/dashboard", viewsRouter);
  app.use("/api/import", importRouter);
  app.use("/api/sort-orders", sortOrdersRouter);
  app.use("/api/export", exportRouter);
  app.use("/api/admin", adminRouter);

  // Serve React build in production
  if (process.env.NODE_ENV === "production") {
    const publicPath = path.join(__dirname, "..", "public");
    app.use(express.static(publicPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(publicPath, "index.html"));
    });
  }

  app.use(errorHandler);

  return app;
}
