import 'dotenv/config';
import { validateEnv } from './config/env';
import { createApp, setStartedAt } from './app';
import { getPool } from './db/client';
import { runMigrations } from './db/migrate';

// Validate environment before anything else
const env = validateEnv();

async function start() {
  const pool = getPool();

  // Verify DB connection
  try {
    await pool.query('SELECT 1');
    // eslint-disable-next-line no-console
    console.log('Database connection established');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to connect to database:', err);
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

start();
