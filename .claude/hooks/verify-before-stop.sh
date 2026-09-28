#!/usr/bin/env bash
# Stop hook: if src/ or tests/ were modified, refuse to end the turn (exit 2)
# while the deterministic checks fail. The agent cannot report "done" over a
# red gate, whatever it believes.
#
# The gate differs by where the turn is happening:
#   - main checkout : typecheck + full test suite
#   - linked worktree (the run's lane)      : typecheck only
# A test-first node legitimately ends its turn red — it writes tests before any
# implementation exists. The suite is the gate at the MERGE, not inside a lane.
set -u

# Work in the tree the turn happened in, not where this script lives: the
# script is always in the main checkout, but a run lives in a linked worktree,
# and a check that cd's to main sees a clean tree and never fires.
cd "$(git rev-parse --show-toplevel 2>/dev/null)" || exit 0

git status --porcelain 2>/dev/null | grep -qE '^.. (src|tests)/' || exit 0

# Avoid re-fire loops: if we already blocked once this turn, let it end.
if command -v jq >/dev/null 2>&1; then
  stop_active=$(jq -r '.stop_hook_active // false' 2>/dev/null)
  [ "$stop_active" = "true" ] && exit 0
fi

# In a linked worktree, .git is a file and --git-dir differs from --git-common-dir.
in_worktree=false
gitdir=$(git rev-parse --absolute-git-dir 2>/dev/null || echo "")
commondir=$(git rev-parse --path-format=absolute --git-common-dir 2>/dev/null || echo "")
[ -n "$gitdir" ] && [ -n "$commondir" ] && [ "$gitdir" != "$commondir" ] && in_worktree=true

if [ "$in_worktree" = true ]; then
  out=$(npm run typecheck --silent 2>&1)
  status=$?
  label="typecheck"
else
  out=$(npm run typecheck --silent 2>&1 && npm test --silent 2>&1)
  status=$?
  label="typecheck or tests"
fi

if [ $status -ne 0 ]; then
  echo "GATE: $label failing on modified files — fix before finishing:" >&2
  echo "$out" | tail -30 >&2
  exit 2
fi
exit 0
