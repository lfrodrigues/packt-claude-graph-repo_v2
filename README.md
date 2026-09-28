# orders-api — Graph Engineering with Claude workshop repo

A deliberately tiny Express + TypeScript API, carrying every control from
"Orchestrating Production-Grade Web Apps with Claude Code" (course 1), so that the workshop starts from a repo where every control is
already in place.

## Setup (2 minutes)

```bash
nvm use            # Node 22+
npm install        # also installs the git hooks (husky)
npm test           # 3 green: the products endpoints
cp .env.example .env   # optional — only needed for the Sentry demo
```

No database, no Docker, no running server needed for tests.

## The feature

`POST /orders`, eight numbered acceptance criteria. The spec is written by
someone who is not the agent and lives **outside this repo** at
`../specs/orders.md`. `/plan orders ../specs/orders.md` copies it into
`docs/specs/orders.md` (one prompt — you approving the contract) and
scaffolds the plan. From then on the spec is read-only for agents: an edit is
blocked, and the hook says why.

## The controls

| Control           | Where                           | Enforces                                                          | Slot  |
| ----------------- | ------------------------------- | ----------------------------------------------------------------- | ----- |
| Instructions      | `CLAUDE.md`                     | Advisory. WON'Ts phrased so violations show in a diff.            | 09:20 |
| Permissions       | `.claude/settings.json`         | deny `.env`, `.husky/`, `.claude/`, specs, templates; ask on push | 09:20 |
| Claude hooks      | `.claude/hooks/*.sh`            | Block with a reason; format on write; **no "done" over red**      | 09:20 |
| Git hooks         | `.husky/`                       | lint+types on commit; `Plan:` trailer required; verify on push    | 09:20 |
| Path-scoped rules | `.claude/rules/*.md`            | Tests: never weaken an assertion. Artifacts: follow the template. | 09:20 |
| Skills            | `.claude/skills/{plan,ship,pr}` | The playbooks: plan file, verified commit, PR from the plan       | 09:20 |
| MCP               | `.mcp.json`                     | Semble (code search) + Sentry (production errors)                 | 09:20 |
| Plans             | `docs/plans/`                   | One plan per change,                                              | 10:15 |

## Show MCP working (Sentry)

```bash
# .env has SENTRY_DSN → the crash endpoint is mounted
npm run dev
curl -i localhost:3000/crash          # 500 {"error":"internal_error"}; the event is in Sentry
```

Then in Claude Code: _"Check the most recent Sentry issue for this project and
plan a fix."_ Without a DSN, `/crash` is a 404 and the SDK is a no-op — tests
never touch it.

## Show the skills working

```bash
claude
> /plan orders ../specs/orders.md   # docs/specs/orders.md + docs/plans/001-orders.md
> …implement…
> /ship orders endpoint        # verify → commit with Plan: trailer → push (asks)
> /pr                          # PR body from the plan, not the diff
```

Try `git commit` without a `Plan:` trailer, or ask Claude to edit `.env`, or to
`git push origin main`. All three are blocked. That is the point.
