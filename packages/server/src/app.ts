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
import { bugReportsRouter } from "./domains/bug-reports/bug-reports.routes";
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
  if (!process.env.CORS_ORIGIN && process.env.NODE_ENV === "production") {
    throw new Error("CORS_ORIGIN must be set in production");
  }
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
      credentials: true,
    }),
  );
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
    // Tighter limit for auth endpoints — 20 attempts per 15 minutes per IP
    app.use(
      "/api/auth",
      rateLimit({
        windowMs: 15 * 60_000,
        limit: 20,
        standardHeaders: "draft-7",
        legacyHeaders: false,
        message: {
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: "Too many login attempts, please try again later",
          },
        },
      }),
    );
  }

  // Health check — not rate-limited
  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // Disable ETag caching for API routes — stale 304s break refresh after mutations
  app.use("/api", (_req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });

  // Mobile app version info — public, no auth
  app.get("/api/mobile/version", (_req, res) => {
    res.json({
      version: "0.1.0",
      versionCode: 1,
      downloadUrl: "/downloads/notes-world-0.1.0.apk",
    });
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
  app.use("/api/bug-reports", bugReportsRouter);

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
