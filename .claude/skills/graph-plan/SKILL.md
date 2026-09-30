---
description: Open a worktree for the feature, then run the graph's planning phase — planner writes docs/plans/<NNN>-<slug>.md and stops at gate 1
argument-hint: <feature-slug | path-to-spec>
disable-model-invocation: true
allowed-tools: Workflow, EnterWorktree, Read, Glob, Bash(ls:*), Bash(git status:*), Bash(git worktree list), Bash(git rev-parse:*), Bash(npm install), Bash(cp:*), Bash(mkdir:*), Bash(test:*)
---

# Open the lane, then plan

Feature: $ARGUMENTS

## 1. Resolve the spec — required, never guessed

A graph that guesses which feature it is building is the mistake the graph
exists to catch. There is no default.

1. **`$ARGUMENTS` is empty → STOP.** Print
   `usage: /graph-plan <feature-slug | path-to-spec>`, then list `docs/specs/`
   so the user can see what is available. Do **not** pick a spec, even if there
   is exactly one.
2. `$ARGUMENTS` is a path that exists → that is the spec.
3. Otherwise try `docs/specs/$ARGUMENTS.md`.
4. Neither exists → **STOP**, and say both what you looked for and what
   `docs/specs/` actually holds. If the directory is empty, say so plainly: the
   spec is written outside this repo and a human copies it in. That copy is not
   your job.

The slug is the spec's basename without `.md`.

## 2. Open a worktree for the run — before anything else

The isolation that matters is **per run, not per node**. The graph gets a
branch of its own so it never mutates `main` while it is still exploring, and
so every node afterwards shares one tree — which is why nothing has to be
committed mid-run.

1. Check where the session is: `git rev-parse --show-toplevel`. If it already
   ends in `.claude/worktrees/<slug>`, say so and **skip to 3 below** —
   `EnterWorktree` refuses to create a worktree from inside one.
2. Otherwise call `EnterWorktree` with `name: "<slug>"`. It creates
   `.claude/worktrees/<slug>` on a new branch and switches this session into
   it. (`worktree.baseRef: "head"` in `.claude/settings.json` is what makes
   this work here — this repo has no remote, and the default `fresh` would look
   for `origin/main`.)
3. Run `npm install`. `node_modules/` is gitignored, so a fresh worktree has
   none, and both the tester and the verifier run `npm test`.
4. **Confirm the spec is in the worktree.** It is committed, so it is — but a
   worktree is a checkout of a ref, so check rather than assume. If it is
   missing, the spec was never committed: **stop and say so.** You cannot copy
   it in — `guard-bash.sh` blocks any write to `docs/specs/`, deliberately, and
   that guard holds regardless of who asks. A human commits it, then you resume
   from step 3.

5. Say what just happened, in one line: the run now has a branch of its own,
   and `main` will not be touched until the merge at gate 2. Note the branch is
   named `worktree-<slug>` while the directory is `<slug>`.

## 3. Resolve the run's stem — one name, two paths

The plan and the run's record share a name, so a reader pairs them on sight
without following a trailer.

1. Find the highest `NNN` in `docs/plans/` and use `NNN+1`, zero-padded to three
   digits. Do this **inside the worktree** — that is the checkout the planner
   writes to.
2. The stem is `<NNN>-<slug>`. Everything derives from it:
   - the plan → `docs/plans/<stem>.md`
   - the run's record → `graph/runs/<stem>/` (step 6 of `/graph-build`)
3. Say the stem out loud in your report. It is the one thing a human needs to
   find both halves later.

The worktree keeps the bare slug (`.claude/worktrees/<slug>`, branch
`worktree-<slug>`). It is scaffolding that gets deleted; the numbered pair is
the durable record.

## 4. Run the workflow

Run the dynamic workflow at `graph/01-plan.js` using the Workflow tool, with
`args` set to
`{ "spec": "<resolved path>", "feature": "<slug>", "plan": "docs/plans/<stem>.md" }`.

The script refuses an absent `args.plan` the same way it refuses an absent
`args.spec`: `NNN` depends on what `docs/plans/` already holds, and a workflow
script has no filesystem access, so resolving it is the skill's job.

## 5. Report, and hand over the gate

When it finishes, print the planner's confidence score and its open questions,
say where the plan landed (`docs/plans/<stem>.md`), and remind me to answer the
questions in `graph/artifacts/decision-log.md` before I run
`/graph-build <slug>`.

**Do not answer them yourself — that is the gate.**

There is no archive step. The plan is already numbered, permanent, and in the
directory this repo keeps plans in; copying it into `graph/runs/` would be the
same document under two paths, drifting from the first edit onwards.
`/graph-build` archives the run's _other_ artifacts to `graph/runs/<stem>/`,
which is named after this plan.

Policy: do NOT write code, do NOT answer the planner's open questions, and do
NOT commit. The run makes one commit, at the end, and a human merges it at
gate 2.
