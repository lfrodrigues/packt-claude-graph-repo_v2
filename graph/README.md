# The engineering graph

Four nodes, four artifacts, two human gates, one bounded loop.

```
spec → planner → ⬡ gate 1
                    │
      implementer  ∥  tester        ← one worktree, the run's
                    │
                 verifier → pass?
                            ├── yes → ⬡ gate 2 → merge
                            └── no  → implementer, scoped (≤ 2) ↺
```

## Every node names the failure mode it fixes

A node that cannot fill the right-hand column does not belong in the graph.

| Node                     | Failure mode it fixes                                 |
| ------------------------ | ----------------------------------------------------- |
| **planner**              | spec ambiguity discovered _after_ the code exists     |
| **implementer ∥ tester** | self-grading — the maker writing its own tests        |
| **one worktree per run** | the graph mutating `main` while it is still exploring |
| **verifier**             | a green suite that encodes the maker's misreading     |

This is deliberately small. A seven-node graph with an analyst, a reviewer and a
dedicated remediator is a fine thing to draw and a bad thing to reach for when
you are adding a route. Most work needs one agent and a Stop hook; the next
thing worth adding is one independent checker. **Two nodes is a graph.**

## Deterministic checks come first

`.claude/hooks/verify-before-stop.sh` runs typecheck and the test suite and
refuses to let a turn end red. It costs nothing and never hallucinates. The
verifier node exists only for what a script cannot do: judge whether a test
would actually _fail_ if a criterion were violated.

Inside the run's worktree that hook gates on typecheck alone — a test-first node
legitimately ends its turn red, and the suite is the gate at the merge rather
than inside the run.

## Isolate the run, not the nodes

`/graph-plan` opens **one** worktree for the whole run and works there. `main`
is untouched until you merge at gate 2, and every node shares one tree — which
is why nothing has to be committed mid-run.

A worktree **per node** would be the wrong granularity. What keeps the
implementer and the tester off each other's files is a **rule** in each agent
file — `implementer.md` bars writes under `tests/`, and the tester writes only
`tests/<feature>.test.ts`. Both hold bare `Edit` and `Write`, so nothing
enforces the split; it holds because the model complies. A worktree each would
not enforce it either — it would buy two full copies of the repo and a merge
somebody has to write.

A worktree is also **not** an information boundary. It is a full copy of the
repo, and `tester.md` holds `Read, Grep, Glob`. The tester's independence rests
on the rule "do NOT read src/routes" in its own file. `tools:` is enforced by
the platform; the rest is a request.

The second honest use is comparison: `/graph-all` runs in
`.claude/worktrees/<slug>-unattended` so the gated and ungated runs can be
diffed against each other.

## The gates

| Moment                 | Pause?  | Why                                     |
| ---------------------- | ------- | --------------------------------------- |
| after planning         | **yes** | a wrong plan wastes the whole build     |
| implementer ∥ tester   | no      | reversible, bounded, on disjoint files  |
| verifier               | no      | it reports, it does not act             |
| FAIL → fix → re-verify | no      | bounded at 2 — the bound is the control |
| before merge / push    | **yes** | the only irreversible act in the run    |

Gate on irreversibility, not on progress. A gate earns a human's attention only
when the agent has a question it cannot answer; approve-everything designs
train people to click yes, which removes the control exactly when it matters.

Gate 2 needs no code of its own: `.claude/settings.json` already puts
`git push` behind `ask` and denies pushes to main and force-pushes.

## Running it

Two commands. The gates are the seams between them.

| Command               | Script        | What it does                                                                                         |
| --------------------- | ------------- | ---------------------------------------------------------------------------------------------------- |
| `/graph-plan <slug>`  | `01-plan.js`  | opens the run's worktree; planner → `docs/plans/<NNN>-<slug>.md`; stops at gate 1                    |
| `/graph-build <slug>` | `02-build.js` | implementer ∥ tester → verifier → bounded remediation (≤ 2) → `ready-for-human-merge` or `escalated` |

The build ends in one of two states. `ready-for-human-merge` carries
`attempts` — how many times the loop fired, and zero is the normal case.
`escalated` means the bound is spent; a human reads `decision-log.md` and
decides. There is no third command to run in between, because there is no
human gate there (see "The gates").

Two more scripts exist outside the graph:

| Command                | Script         | What it is                                                                                                                                                                                                |
| ---------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/graph-verify <slug>` | `03-verify.js` | **the two-node graph** — you changed `src/` by hand; a reader who didn't grades it against the spec, then the same bounded fix loop. Self-grading on a manual change is the failure mode; this is the fix |
| `/graph-all <slug>`    | `00-all.js`    | the whole thing unattended — a _decider_ node answers gate 1. For the A/B in §6                                                                                                                           |

**The slug is required.** `<slug>` names a spec: either `orders`, resolved to
`docs/specs/orders.md`, or a path to a spec file. There is no default and no
inference — not even when `docs/specs/` holds exactly one file. A graph that
guesses which feature it is building is the same class of mistake the graph
exists to catch, so both layers refuse independently: the skill refuses an
empty argument, and the script throws on an absent `args.spec`.

**Only a human starts a run.** The four skills carry
`disable-model-invocation: true`: a run opens a worktree and spends real time,
so it begins when someone types the slash command, never because Claude
inferred one was wanted. Inside a run, every node carries
`permissionMode: acceptEdits`, so a background workflow never stalls on an
edit prompt nobody is watching. The hooks still fire under that mode — the
prompt goes away, the walls around `docs/specs/` and `.claude/` do not.

`npm run demo:reset` returns the repo to its baseline: working tree clean,
artifacts cleared, worktrees and their branches removed.

The scripts are plain JavaScript because a dynamic workflow is parsed as JS —
no type annotations, no Node APIs, no clock and no randomness, because a
resumed run replays cached calls and must produce identical inputs. That
constraint is _why_ the plan and the verdict are files: the orchestrator is a
thin deterministic shell, and everything that has to survive lives on disk.

## Artifacts

`artifacts/` holds what the nodes write — `implementation.md`,
`test-report.md`, `decision-log.md`, `verdict.json`. They are the edges of the
graph: what travels between nodes, rather than a conversation one node can
remember and the next cannot.

Every node reads them off disk, in the run's own worktree, so **nothing is
committed mid-run**. The run makes one commit, at the end, with the work the
artifacts describe — and that commit is what gate 2 merges.

Three paths, three jobs:

| Path                         | Committed?       | Lifetime        | What it is                                |
| ---------------------------- | ---------------- | --------------- | ----------------------------------------- |
| `artifacts/`                 | **no** — ignored | the current run | the edges — what nodes hand each other    |
| `runs/<NNN>-<slug>/`         | yes              | forever         | the record — what this run did            |
| `docs/plans/<NNN>-<slug>.md` | yes              | forever         | the plan — numbered, the commit's trailer |

`artifacts/` is gitignored because its paths are flat: a second feature's run
overwrites the first's, so it is scratch by construction. Each skill copies its
finished artifacts into `runs/<NNN>-<slug>/` when the phase completes, and that
copy is what gets committed. `/graph-all` uses `runs/<NNN>-<slug>-unattended/`,
so the gated and ungated runs can be diffed against each other.

**The plan is not in either.** It lives in `docs/plans/<NNN>-<slug>.md`, where
this repo keeps every plan, whether `/plan` or the planner node wrote it — so
there is one home, one format, one trailer shape, and `.claude/rules/plans.md`
applies to the planner too. The run folder takes the same name as its plan:
`docs/plans/001-orders.md` pairs with `runs/001-orders/` on sight, and the
commit trailer says it a second way, which is what makes
`git log --grep='^Plan:'` resolve to the plan a run actually followed. A run
folder with **no** number is a `/graph-verify` run on a tree nothing planned.

One honest limitation: `NNN` is resolved inside the worktree, a checkout of
`main` at branch time. Two runs open at once can pick the same number, and the
collision surfaces at merge. Fine for one feature at a time; worth naming rather
than pretending.

`verdict.json` is the one artifact in JSON, and deliberately: it is the file a
script reads, and models are measurably less willing to quietly rewrite JSON
than Markdown.
