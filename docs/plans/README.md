# Plans live with the code

Every meaningful change to this repo starts as a plan in this directory, and the
commit that implements it carries a trailer pointing back at it:

```
Plan: docs/plans/001-orders-endpoint.md
```

## Why

Six months from now, a diff tells you _what_ changed. It cannot tell you what
was considered and rejected, what constraint forced a decision, or what the
author believed at the time. The plan can — and because it's committed with the
code, it's versioned and one `git log` away:

```bash
git log --grep='^Plan:'          # every planned change, with its plan
```

## Where a plan starts

A plan starts from a spec — the product's numbered acceptance criteria,
written by someone who is not the agent. **A human puts it in
`docs/specs/<slug>.md`**; no agent can, and the block is deliberate — an agent
that can rewrite its own contract can make any implementation "correct".
`/plan <slug> [path-to-spec]` reads that spec and scaffolds the plan, whose
**Criteria coverage** table maps every step to the `ACn` ids it satisfies.

Two routes produce that file, and the format does not change between them:

- `/plan` — a hand-driven change. You then implement it yourself.
- the graph's **planner** node — `/graph-plan <slug>` writes
  `docs/plans/<NNN>-<slug>.md`, and the run's record lands in the matching
  `graph/runs/<NNN>-<slug>/`.

## How

1. Write the plan as `docs/plans/NNN-short-slug.md` (next number, kebab slug).
2. Commit it with — or before — the code that implements it.
3. Add the `Plan:` trailer to every implementing commit.

The `commit-msg` hook **enforces** step 3: no trailer, no commit, and the
trailer must point at a file that exists.

## What a plan should contain

Context (why, what prompted it) → the approach actually taken (not a survey of
alternatives) → files touched → **how it will be verified**. Reference spec
criteria by id (`AC1`…). Self-score confidence 1–10; below 8, name what is
being guessed.
