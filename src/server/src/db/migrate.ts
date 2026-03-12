import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { getPool, closePool } from './client';

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function migrate() {
  const pool = getPool();

  // Create migrations tracking table if it doesn't exist
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version  VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // Get already-applied migrations
  const { rows: applied } = await pool.query<{ version: string }>(
    'SELECT version FROM schema_migrations ORDER BY version'
  );
  const appliedSet = new Set(applied.map((r) => r.version));

  // Read migration files sorted by name
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  let ran = 0;
  for (const file of files) {
    if (appliedSet.has(file)) continue;

    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    // eslint-disable-next-line no-console
    console.log(`Applying migration: ${file}`);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [file]);
      await client.query('COMMIT');
      // eslint-disable-next-line no-console
      console.log(`  ✓ ${file}`);
      ran++;
    } catch (err) {
      await client.query('ROLLBACK');
      // eslint-disable-next-line no-console
      console.error(`  ✗ ${file}`, err);
      throw err;
    } finally {
      client.release();
    }
  }

  if (ran === 0) {
    // eslint-disable-next-line no-console
    console.log('No new migrations to apply.');
  } else {
    // eslint-disable-next-line no-console
    console.log(`Applied ${ran} migration(s).`);
  }

  await closePool();
}

migrate().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Migration failed:', err);
  process.exit(1);
});
