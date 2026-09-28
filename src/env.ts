/**
 * Environment. Everything here is optional: the app boots and every test runs
 * with no .env at all. Set SENTRY_DSN in .env to send unhandled errors to Sentry.
 */
export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: Number(process.env.PORT ?? 3000),
  SENTRY_DSN: process.env.SENTRY_DSN || undefined,
  SENTRY_ENVIRONMENT: process.env.SENTRY_ENVIRONMENT || undefined,
};
