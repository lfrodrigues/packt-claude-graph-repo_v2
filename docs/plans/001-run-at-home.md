# 001 — Run it at home

## Context

Updated after the workshop so a student can clone this repo and run it on their
own, without the presenter. Supersedes one line of `000`: "`docs/specs/` is
empty at the start; the human copies `../specs/orders.md` in". The spec is now
committed at `docs/specs/orders.md`, so there is nothing to copy.

## Approach

- `README.md`: the exact commands to run, step by step.
- `docs/specs/orders.md`: committed. Still read-only for agents; the hooks and
  deny rules are unchanged.
- Small doc fixes so every file describes the committed spec.

No application code changes.

## Files

- `README.md`
- `CLAUDE.md`
- `docs/specs/orders.md` (new)
- `docs/plans/001-run-at-home.md` (this file)
- `graph/README.md`
- `graph/templates/decision-log.md`
- `scripts/demo-reset.sh`
- `.claude/skills/graph-plan/SKILL.md`
- `.claude/skills/graph-build/SKILL.md`

## Verification

- `npm run verify` green (3 tests).
- `git commit` without a `Plan:` trailer is still rejected.
- Editing `docs/specs/orders.md` through Claude is still blocked with a reason.

Confidence: 9/10.
