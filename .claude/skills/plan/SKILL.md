---
description: Scaffold the next-numbered plan file in docs/plans/, mapping every step to the spec's acceptance criteria when a spec exists
argument-hint: <feature-slug> [path-to-spec]
---

# Scaffold a plan file

Arguments: $ARGUMENTS — the first word is the feature slug; an optional second
word is the path to a spec.

1. **Find the spec.** In order: the path given; else `docs/specs/<slug>.md`.
   If neither exists, continue without one — but say so, and put "no spec;
   criteria are assumed" under Open questions. Never invent `ACn` ids. Never
   edit a spec: it is written by someone who is not you, and the repo blocks
   it.
2. Find the highest `NNN` in `docs/plans/` and use `NNN+1` (zero-padded, 3
   digits). If a plan for the same slug already exists, REFUSE and point at it
   — unless the user explicitly says "supersede", in which case note the
   superseded plan in the new file's Context.
3. Create `docs/plans/NNN-<slug>.md` following `docs/plans/README.md`: Context
   (why, what prompted it), the approach actually taken (not a survey of
   alternatives), files touched, and how it will be verified.
4. If there is a spec, add a **Criteria coverage** table:

   | Step | Files | Criteria |
   | ---- | ----- | -------- |

   Every `ACn` in the spec must appear in at least one row. Any that don't go
   under **Open questions**, with why. Anything in the spec that reads two
   ways goes there too — do not resolve ambiguity silently.

5. Self-score confidence 1–10. Below 8: name what you are guessing about.
6. Remind: every implementing commit needs the trailer
   `Plan: docs/plans/NNN-<slug>.md` — the commit-msg hook enforces it.

Policy: do NOT write code and do NOT commit anything as part of this command.
