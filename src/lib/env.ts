/**
 * Runtime environment helpers.
 *
 * Rules for this store:
 * - Production must never silently fall back to a built-in secret.
 * - Development / test may use a clearly-labelled local secret so `next dev`
 *   and the unit tests keep working without extra setup.
 */

const DEV_JWT_SECRET = "the-bling-corner-local-dev-secret-change-me-32-chars";

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * Returns the signing secret for session and order-access tokens.
 * Throws in production when the secret is missing or too short.
 */
export function getJwtSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;

  if (secret) {
    if (isProduction() && secret.length < 32) {
      throw new Error(
        "NEXTAUTH_SECRET must be at least 32 characters in production."
      );
    }
    return secret;
  }

  if (isProduction()) {
    throw new Error(
      "NEXTAUTH_SECRET is required in production. Refusing to start with a default secret."
    );
  }

  return DEV_JWT_SECRET;
}

/**
 * Reads a required environment variable.
 * In development a missing value is surfaced at the call site so the feature
 * can fail closed with a useful message instead of using a fake credential.
 */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function hasEnv(name: string): boolean {
  const value = process.env[name];
  return Boolean(value && value.trim().length > 0);
}
