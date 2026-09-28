---
description: Grade the current tree against a spec, with bounded remediation — a utility, not a phase of the graph
argument-hint: <feature-slug | path-to-spec>
disable-model-invocation: true
allowed-tools: Workflow, Read, Glob, Bash(ls:*), Bash(git status:*), Bash(cp:*), Bash(mkdir:*)
---

# Verify the current tree against a spec

Feature: $ARGUMENTS

## 1. Resolve the spec — required, never guessed

Identical contract to `/graph-plan`. There is no default.

1. **`$ARGUMENTS` is empty → STOP.** Print
   `usage: /graph-verify <feature-slug | path-to-spec>`, then list `docs/specs/`.
   Do **not** pick a spec, even if there is exactly one.
2. `$ARGUMENTS` is a path that exists → that is the spec.
3. Otherwise try `docs/specs/$ARGUMENTS.md`.
4. Neither exists → **STOP**, naming what you looked for and what `docs/specs/`
   holds.

The slug is the spec's basename without `.md`.

## 2. Run the workflow

This is a **utility**, not a phase of the graph. The graph is `/graph-plan`
then `/graph-build`, and the build already verifies and remediates. Use this
when there is no build in front of it: someone hand-edited `src/` and wants the
verifier's opinion on whatever is in the tree right now. It runs anywhere —
main, a worktree, a branch — because that is the point.

Run the dynamic workflow at `graph/03-verify.js` using the Workflow tool, with
`args` set to `{ "spec": "<resolved path>", "feature": "<slug>" }`.

It grades the current contents of `src/`, whether or not the graph produced
them. That is deliberate: it can be pointed at a hand-written refactor that
never went through the graph at all.

## 3. Report

Report the per-criterion verdict. If remediation ran, say how many attempts it
used **out of the bound** — the bound is the control, so name it. If the run
came back `escalated`, say so plainly: the bound is spent and this is now a
human's decision, with `graph/artifacts/decision-log.md` as the evidence.

## 4. Archive

Glob `docs/plans/*-<slug>.md` to find out whether anything planned this tree.

- **Exactly one match** → the stem is its basename without `.md`; archive to
  `graph/runs/<stem>/`, alongside the run that plan belongs to.
- **No match** → archive to the bare `graph/runs/<slug>/` and **say so** in your
  report: "no plan behind this tree — archived to `graph/runs/<slug>/`." That is
  the normal case here, and the missing number is the honest signal. This command
  exists for the tree someone hand-edited; nothing planned it, so nothing
  numbered it.
- **More than one** → use the bare `graph/runs/<slug>/` and name the candidates.
  Do not pick one.

Copy `graph/artifacts/verdict.json`, `verdict.md` and `decision-log.md` there.
If files from an earlier phase of the same run are already present, do not
overwrite them with older copies.

Policy: do NOT fix anything yourself. Remediation is a node inside the
workflow, scoped to `failed_criteria` and bounded at two attempts. Fixing it
outside the graph destroys the thing being demonstrated.
