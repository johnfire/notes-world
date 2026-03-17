const required = (key: string): string => {
  const val = process.env[key];
  if (!val) {
    // eslint-disable-next-line no-console
    console.error(`FATAL: Missing required environment variable: ${key}`);
    process.exit(1);
  }
  return val;
};

const optional = (key: string, fallback: string): string =>
  process.env[key] ?? fallback;

export function validateEnv() {
  const env = {
    PORT: parseInt(optional('PORT', '3001'), 10),
    NODE_ENV: optional('NODE_ENV', 'development'),
    POSTGRES_HOST: optional('POSTGRES_HOST', 'localhost'),
    POSTGRES_PORT: parseInt(optional('POSTGRES_PORT', '5432'), 10),
    POSTGRES_DB: optional('POSTGRES_DB', 'notes_world'),
    POSTGRES_USER: optional('POSTGRES_USER', 'notes_world'),
    POSTGRES_PASSWORD: required('POSTGRES_PASSWORD'),
    PHASE1_USER_ID: optional('PHASE1_USER_ID', '00000000-0000-0000-0000-000000000001'),
  };

  if (isNaN(env.PORT) || env.PORT < 1 || env.PORT > 65535) {
    // eslint-disable-next-line no-console
    console.error(`FATAL: PORT must be a number between 1 and 65535, got: ${process.env.PORT}`);
    process.exit(1);
  }

  if (isNaN(env.POSTGRES_PORT) || env.POSTGRES_PORT < 1 || env.POSTGRES_PORT > 65535) {
    // eslint-disable-next-line no-console
    console.error(`FATAL: POSTGRES_PORT must be a number between 1 and 65535, got: ${process.env.POSTGRES_PORT}`);
    process.exit(1);
  }

  return env;
}
