# orders-api — Graph Engineering with Claude workshop repo

A deliberately tiny Express + TypeScript API, carrying every control from
"Orchestrating Production-Grade Web Apps with Claude Code" (course 1), so that
the workshop starts from a repo where every control is already in place.

**A graph of four agents builds the feature here** — planner, implementer ∥
tester, verifier — with a human gate after planning and another before the
merge. `repo_v1` is the same feature built by one agent; the controls are
identical, and the difference is that something other than the maker grades the
work.

## Setup (3 minutes)

```bash
nvm use        # Node 22+
npm install    # also installs the git hooks (husky)
npm test       # 3 green: the products endpoints
claude         # run once here and accept the workspace-trust prompt
```

That last step matters and is easy to skip. The graph puts your session in a
git worktree, and an interactive worktree session **exits with an error** if
the directory has not been trusted. Trust it once now rather than debugging it
mid-run.

No database, no Docker, no running server needed for tests.

## The feature

`POST /orders`, eight numbered acceptance criteria, already in the repo at
`docs/specs/orders.md`.

The spec was authored by someone who is not the agent — the original lives at
`../specs/orders.md` and a human committed the copy. From here it is
**read-only for agents**: an edit is blocked by `protect-files.sh`, a `cp` or
redirect into `docs/specs/` is blocked by `guard-bash.sh`, and both say why. An
agent that can rewrite its own contract can make any implementation "correct".

It has to be _committed_, not just present: every node runs inside a git
worktree, and a worktree is a checkout of a ref. An uncommitted spec does not
exist there.

## The graph

Four nodes, two human gates, one bounded loop.

```
spec → planner → ⬡ gate 1
                    │
      implementer  ∥  tester
                    │
                 verifier → pass?
                            ├── yes → ⬡ gate 2 → merge
                            └── no  → implementer, scoped (≤ 2) ↺
```

Every node exists to fix a named failure mode: the planner catches spec
ambiguity _before_ code exists; splitting implementer from tester stops the
maker writing its own tests; the verifier catches a green suite that encodes
the maker's misreading. `graph/README.md` is the design document — why these
nodes, where the gates go, and when this is not worth doing.

## Run the graph

Two commands, with a gate between them that is yours.

### 1 · Plan — `/graph-plan orders`

```
> /graph-plan orders
```

Four things happen:

1. `EnterWorktree` moves this session into `.claude/worktrees/orders`, on a new
   branch `worktree-orders`. **`main` is not touched again until you merge.**
2. `npm install` runs there — a worktree is a fresh checkout with no
   `node_modules/`, and the tester and verifier both need `npm test`.
3. The skill resolves the run's **stem**: the highest `NNN` in `docs/plans/`
   plus one, giving `002-orders`. The plan goes to `docs/plans/002-orders.md`
   and the run's record will go to `graph/runs/002-orders/`. One name, two
   paths, so a reader pairs them on sight.
4. `graph/01-plan.js` runs the **planner** node, which writes the plan and
   reports its confidence score and open questions.

Then it stops. That is gate 1.

The slug is **required** — there is no default and no inference, not even when
`docs/specs/` holds exactly one file. A graph that guesses which feature it is
building is the same class of mistake the graph exists to catch, so the skill
and the script refuse independently.

### 2 · Gate 1 — you answer, by hand

The planner does not resolve ambiguity; it reports it. Answer its questions in
a decision log **inside the worktree**:

```
.claude/worktrees/orders/graph/artifacts/decision-log.md
```

Number your answers to match the planner's questions.
`graph/templates/decision-log.md` has the shape:

```markdown
# Decision log — 002-orders

Plan: `docs/plans/002-orders.md`

## Gate 1 — answered by the human, <date>

1. **<the planner's question>**
   <your answer, and what it licenses a node to do>
```

`/graph-build` refuses to start without this file. **That refusal is the
gate** — it is the one place in the run where a human's answer changes what
gets built, and a wrong plan wastes the whole build.

### 3 · Build — `/graph-build orders`

```
> /graph-build orders
```

It checks you are in the worktree, re-derives the stem, confirms the decision
log exists, then runs `graph/02-build.js`:

| Phase   | Node                 | What it does                                            |
| ------- | -------------------- | ------------------------------------------------------- |
| Build   | implementer ∥ tester | in parallel, on disjoint files: `src/` and `tests/`     |
| Check   | verifier             | grades every `ACn` against the spec, writes a verdict   |
| Recover | implementer, ≤ 2     | fixes **only** `failed_criteria`, re-verified each time |

The remediation loop is bounded in code, not in a prompt. The bound is the
control, so the run ends in one of exactly two states:

- **`ready-for-human-merge`** — then read the **observations** section of
  `graph/artifacts/verdict.md`. That is where the verifier lists what the green
  suite does _not_ prove, and it is the most useful thing in the run.
- **`escalated`** — the bound is spent and this is now your decision.
  `graph/artifacts/decision-log.md` holds every attempt. This is a correct
  outcome, not a failed run.

### 4 · Gate 2 — you commit, then you merge

The graph never commits. **Commit inside the worktree**, where the session is:

```bash
git add -A     # src/, tests/, docs/plans/002-orders.md, graph/runs/002-orders/
git commit     # trailer required: Plan: docs/plans/002-orders.md
```

Then leave the worktree — ask Claude to exit it, or end the session. You are
asked whether to keep or remove the worktree; the branch survives either way.

**The merge is yours, from the main checkout, in your own terminal:**

```bash
git merge worktree-orders
```

Claude cannot run that merge from inside the lane, and this is enforced rather
than agreed: while a session is isolated in a worktree, Claude Code blocks any
Bash command whose working directory resolves to the main checkout — including
a `cd` into it before running git. Gate 2 belongs to a human by construction.

`graph/artifacts/` is gitignored — it is the live working set, overwritten by
the next run. What lands in history is `graph/runs/002-orders/` and the plan it
is named after.

## Two more commands, off the main path

| Command                | What it is                                                                                                                                                                                                |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/graph-verify <slug>` | Grades whatever is in the tree right now against the spec, with the same bounded fix loop. For a hand-written refactor that never went through the graph. Runs anywhere — main, a branch, a worktree.     |
| `/graph-all <slug>`    | The whole graph unattended, in its own worktree `<slug>-unattended`: a _decider_ node answers gate 1 instead of you. For diffing a gated run against an ungated one. **Not the recommended way to work.** |

`/graph-all` exists to be compared against, not copied. The decider may well
answer correctly — that is not evidence the gate is unnecessary, because you do
not find out which way it went until afterwards, and not needing to find out is
the point of the gate.

This repo also keeps `/plan`, `/ship` and `/pr` from `repo_v1`, so the
single-agent path can be run here for comparison. `/plan` and the graph's
planner write to the same `docs/plans/` with the same numbering.

## Start over

```bash
npm run demo:reset    # removes worktrees + branches, clears artifacts, returns to HEAD
```

It **discards uncommitted work** — run it from a committed baseline, not
mid-edit. And it force-removes every worktree, including one a Claude session
is still sitting in, so exit those sessions first rather than having the floor
pulled out from under them.

## The controls

Carried unchanged from `repo_v1`. The graph sits on top of them.

| Control           | Where                    | Enforces                                                         |
| ----------------- | ------------------------ | ---------------------------------------------------------------- |
| Instructions      | `CLAUDE.md`              | Advisory. WON'Ts phrased so violations show in a diff            |
| Permissions       | `.claude/settings.json`  | deny `.env`, `.husky/`, `.claude/`, specs; ask on push           |
| Claude hooks      | `.claude/hooks/*.sh`     | Block with a reason; format on write; **no "done" over red**     |
| Git hooks         | `.husky/`                | lint+types on commit; `Plan:` trailer required; verify on push   |
| Path-scoped rules | `.claude/rules/*.md`     | Tests: never weaken an assertion. Artifacts: follow the template |
| Subagents         | `.claude/agents/*.md`    | One file per node: its role, tools, model, and boundaries        |
| Skills            | `.claude/skills/graph-*` | The graph's entry points; each refuses an empty slug             |
| MCP               | `.mcp.json`              | Semble (code search) + Sentry (production errors)                |
| Plans             | `docs/plans/`            | One plan per change; the `commit-msg` hook enforces the trailer  |

What every one of these has in common: **none of them checks the work.** That
is what the verifier node is for.

## Try to break it

Run these. All are blocked, and the point is the reason each one gives.

In your terminal — the git hooks guard every commit, whoever makes it:

```bash
echo hi > scratch.txt && git add scratch.txt   # stage something first
git commit -m "no plan trailer"                # commit-msg hook rejects it
git rm -q --cached scratch.txt && rm scratch.txt   # put it back
```

And in Claude Code — these are enforced by `.claude/settings.json` and the
Claude hooks, so they only bind the agent. From your own terminal, `--no-verify`
and a push to `main` are yours to make:

```
> edit .env to add a fake DSN                 # protect-files.sh blocks, with a reason
> change AC5 in the spec to match the code    # blocked — the spec is the contract
> run git push origin main                    # denied outright
> commit with --no-verify                     # denied — the hooks are the gate
> /graph-build                                # refuses: the slug is required
```

If a tool call is blocked, that is the guardrail working. The agent is asked to
say what it wanted and why, and let you decide — not to route around it.
