---
description: The whole graph unattended — a decider agent answers gate 1 instead of a human
argument-hint: <feature-slug | path-to-spec>
disable-model-invocation: true
allowed-tools: Workflow, EnterWorktree, Read, Glob, Bash(ls:*), Bash(git status:*), Bash(git rev-parse:*), Bash(git worktree list), Bash(npm install), Bash(cp:*), Bash(mkdir:*)
---

# Run the whole graph with no human in it

Feature: $ARGUMENTS

## 1. Resolve the spec — required, never guessed

Identical contract to `/graph-plan`. There is no default.

1. **`$ARGUMENTS` is empty → STOP.** Print
   `usage: /graph-all <feature-slug | path-to-spec>`, then list `docs/specs/`.
   Do **not** pick a spec, even if there is exactly one.
2. `$ARGUMENTS` is a path that exists → that is the spec.
3. Otherwise try `docs/specs/$ARGUMENTS.md`.
4. Neither exists → **STOP**, naming what you looked for and what `docs/specs/`
   holds.

The slug is the spec's basename without `.md`.

## 2. Open a lane of its own

This run must not land in the same tree as the gated run, or there is nothing
to compare. It gets its own worktree, named for the contrast:

1. `git rev-parse --show-toplevel`. If the session already ends in
   `.claude/worktrees/<slug>-unattended`, skip to 3 below.
2. Otherwise call `EnterWorktree` with `name: "<slug>-unattended"`.
3. Run `npm install` — a fresh worktree has no `node_modules/`.

The decider writes its own `decision-log.md` here, so nothing has to travel in
either direction: the worktree branches from a ref that already has the spec,
and nothing needs to come back.

## 3. Resolve this run's stem

Same rule as `/graph-plan`, against the slug `<slug>-unattended` so the two runs
never share a plan: highest `NNN` in `docs/plans/` + 1, zero-padded, giving the
stem `<NNN>-<slug>-unattended`. Resolve it **inside this worktree**.

The plan → `docs/plans/<stem>.md`; the record → `graph/runs/<stem>/`.

The unattended run gets a real, numbered entry in the plan history. Its plan
says a model answered gate 1 — hiding the run would make the comparison in §6
dishonest.

## 4. Run the workflow

Run the dynamic workflow at `graph/00-all.js` using the Workflow tool, with
`args` set to
`{ "spec": "<resolved path>", "feature": "<slug>", "plan": "docs/plans/<stem>.md" }`.

This is the **ungated** run: a `decider` node answers the planner's open
questions in place of a human, because a dynamic workflow cannot pause for a
person. That is the only difference from the gated run — which is what makes
the two comparable on exactly one variable.

## 5. Report

Report the final status, and say which gate-1 answers the decider chose. State
plainly that a model decided them.

Then the honest caveat: **the decider may well have answered correctly.** If it
did, that is not evidence the gate is unnecessary — you do not find out which
way it went until afterwards, and not needing to find out is the point of the
gate.

## 6. Archive

Copy every artifact except the plan to `graph/runs/<stem>/` — kept separate from
the gated run's own `graph/runs/<NNN>-<slug>/` so the two can be diffed. The plan
is already at `docs/plans/<stem>.md`, which is where this folder gets its name.

The comparison is between the two worktrees:

```bash
diff .claude/worktrees/<slug>/graph/artifacts/decision-log.md \
     .claude/worktrees/<slug>-unattended/graph/artifacts/decision-log.md
diff .claude/worktrees/<slug>/src/routes/<slug>.ts \
     .claude/worktrees/<slug>-unattended/src/routes/<slug>.ts
```

## Use it for

Rehearsal, generating captured fallbacks, and as insurance: start it early and
a finished run is standing by if a live phase stalls.

Policy: do NOT present this as the recommended way to work. The point of the
comparison is what the gate buys.
