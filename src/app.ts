import express from 'express';
import * as Sentry from '@sentry/node';
import { env } from './env.js';
import { productsRouter } from './routes/products.js';
import { debugRouter } from './routes/debug.js';

/** App factory: tests build the app without binding a port. */
export function createApp() {
  const app = express();
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.use('/products', productsRouter);

  // Crash endpoint, only when monitoring is configured. Proves that an
  // unhandled error actually reaches Sentry; never a public route.
  if (env.SENTRY_DSN) {
    app.use('/crash', debugRouter);
  }

  // After the routes, before our own handler. Sentry captures and calls
  // next(err); the client still gets a generic 500 with no stack trace.
  // No-op when Sentry.init was skipped.
  Sentry.setupExpressErrorHandler(app);

  app.use(
    (err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      console.error(err);
      res.status(500).json({ error: 'internal_error' });
    }
  );

  return app;
}
