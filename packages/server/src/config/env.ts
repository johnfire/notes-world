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

// HS256 security rests entirely on secret strength — a short/guessable secret
// lets an attacker forge tokens for any user. Fail closed at boot.
const JWT_SECRET_MIN_LENGTH = 32;
const requireSecret = (key: string, minLength: number): string => {
  const val = required(key);
  if (val.length < minLength) {
    // eslint-disable-next-line no-console
    console.error(
      `FATAL: ${key} must be at least ${minLength} characters (got ${val.length})`,
    );
    process.exit(1);
  }
  return val;
};

export function validateEnv() {
  const env = {
    PORT: parseInt(optional("PORT", "3001"), 10),
    NODE_ENV: optional("NODE_ENV", "development"),
    POSTGRES_HOST: optional("POSTGRES_HOST", "localhost"),
    POSTGRES_PORT: parseInt(optional("POSTGRES_PORT", "5432"), 10),
    POSTGRES_DB: optional("POSTGRES_DB", "notes_world"),
    POSTGRES_USER: optional("POSTGRES_USER", "notes_world"),
    POSTGRES_PASSWORD: required("POSTGRES_PASSWORD"),
    JWT_SECRET: requireSecret("JWT_SECRET", JWT_SECRET_MIN_LENGTH),
  };

  if (isNaN(env.PORT) || env.PORT < 1 || env.PORT > 65535) {
    // eslint-disable-next-line no-console
    console.error(
      `FATAL: PORT must be a number between 1 and 65535, got: ${process.env.PORT}`,
    );
    process.exit(1);
  }

  if (
    isNaN(env.POSTGRES_PORT) ||
    env.POSTGRES_PORT < 1 ||
    env.POSTGRES_PORT > 65535
  ) {
    // eslint-disable-next-line no-console
    console.error(
      `FATAL: POSTGRES_PORT must be a number between 1 and 65535, got: ${process.env.POSTGRES_PORT}`,
    );
    process.exit(1);
  }

  // If billing is enabled in production (Stripe secret key present), its
  // dependent secrets must also be configured. Otherwise webhooks can't be
  // verified and subscription/role updates silently break (fail-closed).
  if (env.NODE_ENV === "production" && process.env.STRIPE_SECRET_KEY) {
    for (const key of [
      "STRIPE_WEBHOOK_SECRET",
      "STRIPE_PRICE_MONTHLY_ID",
      "STRIPE_PRICE_ANNUAL_ID",
    ]) {
      if (!process.env[key]) {
        // eslint-disable-next-line no-console
        console.error(
          `FATAL: ${key} is required when STRIPE_SECRET_KEY is set in production`,
        );
        process.exit(1);
      }
    }
  }

  return env;
}
