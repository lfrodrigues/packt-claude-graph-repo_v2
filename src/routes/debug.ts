import { Router } from 'express';

/** Mounted only when SENTRY_DSN is set (see `app.ts`). Exists to prove the
 *  monitoring pipeline end to end: hit it, then find the event in Sentry. */
export const debugRouter: Router = Router();

// Deliberately triggers a real runtime bug rather than an explicit throw:
// averaging an empty array gives NaN, and NaN is not a valid array length.
debugRouter.get('/', (req) => {
  const amounts: number[] = [];
  const total = amounts.reduce((sum, n) => sum + n, 0);
  const average = total / amounts.length;

  const bucket = new Array(average).fill(req.query.label ?? 'unlabeled');
  return bucket;
});
