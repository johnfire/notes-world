import "dotenv/config";
import { validateEnv } from "./config/env";
import { createApp, setStartedAt } from "./app";
import { getPool } from "./db/client";
import { runMigrations } from "./db/migrate";
import { logger } from "./utils/logger";

// Validate environment before anything else
const env = validateEnv();

// Last-resort handlers so a stray throw/rejection is logged (with stack) to the
// master log instead of vanishing. uncaughtException leaves the process in an
// undefined state, so we log and exit to let the supervisor restart cleanly.
process.on("uncaughtException", (err) => {
  logger.error("uncaughtException", {
    message: err.message,
    stack: err.stack,
  });
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  const err = reason instanceof Error ? reason : undefined;
  logger.error("unhandledRejection", {
    message: err?.message ?? String(reason),
    stack: err?.stack,
  });
});

async function start() {
  const pool = getPool();

  // Verify DB connection
  try {
    await pool.query("SELECT 1");
    // eslint-disable-next-line no-console
    console.log("Database connection established");
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Failed to connect to database:", err);
    process.exit(1);
  }

  // Run migrations on every startup — idempotent, safe
  await runMigrations(pool);

  const app = createApp();
  setStartedAt(new Date());

  app.listen(env.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Server running on port ${env.PORT} (${env.NODE_ENV})`);
  });
}

start(); // pipeline test 2026-05-31
