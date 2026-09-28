import * as Sentry from '@sentry/node';
import { env } from './env.js';

/**
 * Sentry's auto-instrumentation must run BEFORE Express is imported, so this
 * module is the very first import of `server.ts` — ahead of `./app.js`.
 *
 * When SENTRY_DSN is unset (dev without a DSN, and every test) init is skipped
 * and the SDK is a no-op. `createApp()` never touches this file, so tests need
 * nothing configured.
 */
if (env.SENTRY_DSN) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.SENTRY_ENVIRONMENT ?? env.NODE_ENV,
  });
}
