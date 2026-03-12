import 'dotenv/config';
import { createApp } from './app';
import { getPool } from './db/client';

const PORT = parseInt(process.env.PORT ?? '3001', 10);

async function start() {
  // Verify DB connection before accepting traffic
  try {
    await getPool().query('SELECT 1');
    // eslint-disable-next-line no-console
    console.log('Database connection established');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to connect to database:', err);
    process.exit(1);
  }

  const app = createApp();

  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Server running on port ${PORT} (${process.env.NODE_ENV ?? 'development'})`);
  });
}

start();
