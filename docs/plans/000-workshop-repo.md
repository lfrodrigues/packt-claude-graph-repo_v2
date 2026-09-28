# 000 — The workshop repo itself

## Context

A small Express API with every control from course 1 in place, so that the
workshop starts from a repo where every control is already in place. The
feature to build is `POST /orders` (`docs/specs/orders.md`).

## Approach

- `src/`: products endpoints, in-memory store, zod schemas. No orders route yet.
- `docs/specs/` is empty at the start; the human copies `../specs/orders.md` in.
- Controls: `CLAUDE.md`, `.claude/{settings,hooks,rules,skills}`,
  `.husky/`, `docs/plans/`, `.mcp.json` (semble + sentry), Sentry
  instrumentation with a `/crash` endpoint mounted only when a DSN is set.

## Files

Everything in the initial commit.

## Verification

- `npm run verify` green (3 tests).
- `git commit` without a `Plan:` trailer is rejected.
- Through Claude: editing `.env` or `docs/specs/**` is blocked with a reason;
  `git push origin main`, `--force`, `--no-verify` are blocked.
- `SENTRY_DSN=… npm run dev && curl localhost:3000/crash` → 500, event in
  Sentry; without a DSN `/crash` is 404.
