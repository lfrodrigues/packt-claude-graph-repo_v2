# orders-api — agent instructions

A tiny Express + TypeScript API with an in-memory store, carrying the controls
from the previous workshop. The feature to build is `POST /orders`; the spec is
`docs/specs/orders.md`.

Here it is built by a **graph of four agents** rather than one — planner,
implementer ∥ tester on disjoint files, verifier — with a human gate after
planning and another before merge. See `graph/README.md`; it is the design
document and it is short on purpose.

Run it with `/graph-plan <slug>`, then `/graph-build <slug>`. The build
verifies and remediates on its own, bounded at two attempts, and ends
merge-ready or escalated. The slug names a spec in `docs/specs/` and is
**required** — the graph refuses to start without being told which feature it
is building. `/graph-verify <slug>` is a standalone check for a tree with no
build in front of it.

`/graph-plan` opens a worktree for the run and works there, so the graph never
touches `main` while it is exploring. Nothing is committed mid-run: one commit
at the end, merged at gate 2.

## Commands

| Task           | Command             |
| -------------- | ------------------- |
| Tests          | `npm test`          |
| Typecheck      | `npm run typecheck` |
| Everything     | `npm run verify`    |
| Run the server | `npm run dev`       |

`npm run verify` is the definition of green; the pre-push hook runs exactly
this. Tests hit the app factory directly (`createApp()`), no server needed.

## Layout

- `src/app.ts` — factory. `src/store.ts` — in-memory data with `reset()`.
- `src/routes/` — one router per resource. `src/schemas.ts` — zod schemas.
- `tests/` — vitest + supertest, one file per resource.
- `docs/specs/` — the contract, committed to this repo by a human. It must be
  committed: every node runs in a worktree, and a worktree is a checkout of a
  ref. **Read-only for agents:** an edit is blocked, and the hook says why.
- `docs/plans/` — the plan behind every change, whether `/plan` or the graph's
  planner node wrote it. See "Plans" below.
- `graph/` — the agent graph: the four phase scripts, node templates, and
  `graph/runs/<NNN>-<slug>/`, where each finished run is archived under the same
  name as its plan. `graph/artifacts/` is the live working set every node reads
  off disk in the run's own worktree — **gitignored**, overwritten by the next
  run, never committed.

## WON'T — hard prohibitions

- **WON'T edit anything under `docs/specs/`.** If the spec is wrong or
  ambiguous, say so in your output; never change the spec to match the code.
- **WON'T delete, weaken or skip a test assertion to make a suite pass.** A red
  test is information.
- **WON'T commit or push unless explicitly asked.** `/ship` asks; a push to
  main, a force-push, or `--no-verify` is blocked outright.
- **WON'T add a dependency without saying why.**

## Plans

Every meaningful change gets a plan in `docs/plans/NNN-slug.md`, and the
commit that implements it carries the trailer

```
Plan: docs/plans/001-orders-endpoint.md
```

The `commit-msg` hook rejects commits without it.

## Verify before claiming

"It typechecks" is not "it works". Run `npm test` before reporting done. When
you report, list which acceptance criteria (AC1…AC8 in the spec) you covered and
which you did not.

## What is enforced vs. advisory

This file is advisory. The things that matter are enforced where an agent can't
disable them: permission rules and hooks in `.claude/settings.json`, and git
hooks in `.husky/`. If a tool
call is blocked, **that is the guardrail working — do not route around it.**
Say what you wanted to do and why, and let the human decide.
