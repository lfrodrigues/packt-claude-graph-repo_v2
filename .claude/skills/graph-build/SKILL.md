---
description: Run the graph's build phase — implementer ∥ tester, verify, bounded remediation; ends merge-ready or escalated
argument-hint: <feature-slug | path-to-spec>
disable-model-invocation: true
allowed-tools: Workflow, Read, Glob, Bash(ls:*), Bash(git status:*), Bash(git rev-parse:*), Bash(git worktree list), Bash(cp:*), Bash(mkdir:*)
---

# Run the build phase of the engineering graph

Feature: $ARGUMENTS

## 1. Resolve the spec — required, never guessed

Identical contract to `/graph-plan`. There is no default.

1. **`$ARGUMENTS` is empty → STOP.** Print
   `usage: /graph-build <feature-slug | path-to-spec>`, then list `docs/specs/`.
   Do **not** pick a spec, even if there is exactly one.
2. `$ARGUMENTS` is a path that exists → that is the spec.
3. Otherwise try `docs/specs/$ARGUMENTS.md`.
4. Neither exists → **STOP**, naming what you looked for and what `docs/specs/`
   holds.

The slug is the spec's basename without `.md`.

## 2. Refuse to build on main

`git rev-parse --show-toplevel`. If the session is **not** inside
`.claude/worktrees/<slug>`, **STOP** and say to run `/graph-plan <slug>` first —
that is what opens the lane.

The build writes `src/` and `tests/`. It does not do that on your default
branch.

## 3. Re-derive the run's stem, and check gate 1 happened

Glob `docs/plans/*-<slug>.md`. The exact `-<slug>.md` suffix is what keeps
`orders` and `orders-unattended` from matching each other.

- **Exactly one match** → the stem is its basename without `.md`
  (e.g. `001-orders`). The plan is `docs/plans/<stem>.md`; the run's record will
  go to `graph/runs/<stem>/`.
- **No match** → **STOP.** `/graph-plan <slug>` has not run, or ran somewhere
  else. There is no plan to build against.
- **More than one** → **STOP and ask which.** A graph that guesses which plan it
  is building against is the same class of mistake the graph exists to catch.

Then `graph/artifacts/decision-log.md` must exist. If it is missing, **stop and
tell me** — gate 1 has not happened yet, and building without it wastes the run.

## 4. Run the workflow

Run the dynamic workflow at `graph/02-build.js` using the Workflow tool, with
`args` set to
`{ "spec": "<resolved path>", "feature": "<slug>", "plan": "docs/plans/<stem>.md" }`.

The implementer and the tester run at the same time, in this one tree. That is
safe because their tool lists keep them apart — the implementer may not write
under `tests/`, the tester writes only `tests/<slug>.test.ts`. Nothing needs
merging, and nothing needs committing.

## 5. Report

The workflow runs the verifier and, if the verdict fails, a bounded remediation
loop — the implementer fixes only `failed_criteria`, at most twice, re-verified
each time. You do not need to run anything else.

- **`ready-for-human-merge`** — say how many remediation attempts were used out
  of the bound. **Zero is the normal case; name it as such.** Then point me at
  the **observations** section of `graph/artifacts/verdict.md` — where the
  verifier lists what the test suite does _not_ prove even though everything
  passed. That is the most useful thing in the run.
- **`escalated`** — say plainly that the bound is spent and this is now a
  human's decision. Name the criteria still failing and point at
  `graph/artifacts/decision-log.md`, which holds every attempt.

## 6. Archive

Copy the finished artifacts to `graph/runs/<stem>/` — `implementation.md`,
`test-report.md`, `decision-log.md`, `verdict.json`, `verdict.md`. Create the
directory if needed. Not `plan.md`: the plan is already committed at
`docs/plans/<stem>.md`, which is where the folder gets its name.

## 7. Hand over gate 2

Tell me what the run's single commit will contain, and print it:

```bash
git add -A        # src/, tests/, docs/specs/<slug>.md, docs/plans/<stem>.md, graph/runs/<stem>/
git commit        # trailer required: Plan: docs/plans/<stem>.md
```

`graph/artifacts/` is gitignored and does not land — it is the live working set,
overwritten by the next run. What lands is the record in `graph/runs/<stem>/`
and the plan it is named after, so the commit carries a matched pair.

The spec is in that commit on purpose. A human copied it into this lane, and it
belongs with the code it describes — merging the branch is what finally puts
both into `main`'s history, together, in one reviewable change.

The `commit-msg` hook rejects a commit with no `Plan:` trailer, and rejects a
trailer pointing at a file that does not exist. `docs/plans/<stem>.md` is where
this repo keeps plans, whoever wrote them — so a graph run's commit reads
exactly like a hand-driven one, and `git log --grep='^Plan:'` resolves them the
same way.

Policy: do NOT run that commit yourself, do NOT merge the branch, do NOT push.
Print it and stop. The merge is gate 2, and it is mine.
