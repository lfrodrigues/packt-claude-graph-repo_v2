#!/usr/bin/env bash
# Return the demo repo to its baseline so the graph can be run again from clean.
# Safe to run repeatedly; safe to run when nothing has happened yet.
#
# This script returns the tree to HEAD. It DISCARDS uncommitted work by design
# — run it from a committed baseline, not mid-edit.
set -u

root=$(cd "$(dirname "$0")/.." && pwd)
cd "$root" || exit 1

current=$(git rev-parse --abbrev-ref HEAD)

# The worktree list is the source of truth for what to clean up. Worktree names
# are feature slugs now (orders, orders-unattended), not a fixed prefix, so a
# name pattern would miss them.
paths=$(git worktree list --porcelain | awk '/^worktree /{print $2}' | grep -v "^$root\$" || true)
branches=$(git worktree list --porcelain | awk '/^branch /{sub("refs/heads/","",$2); print $2}' || true)

echo "→ removing graph worktrees"
for wt in $paths; do
  # A worktree a Claude session entered is LOCKED ("claude session <name>").
  # Plain --force refuses a locked tree; -f -f overrides. Exit any session in
  # the worktree before running this, or you are yanking the floor out from
  # under it.
  if git worktree remove --force "$wt" 2>/dev/null; then
    echo "  removed $wt"
  elif git worktree remove -f -f "$wt" 2>/dev/null; then
    echo "  removed $wt (was locked)"
  else
    echo "  COULD NOT REMOVE $wt — is a session still running in it?"
  fi
done
git worktree prune

echo "→ deleting their branches"
for b in $branches; do
  case "$b" in
    main | master | "$current") continue ;;
  esac
  git branch -D "$b" >/dev/null 2>&1 && echo "  deleted $b"
done

echo "→ clearing graph artifacts"
find graph/artifacts -type f ! -name 'README.md' -delete 2>/dev/null
echo "→ discarding working-tree changes"
git checkout -- . 2>/dev/null
git clean -fd src tests docs/plans graph/runs 2>/dev/null
# graph/probes/ is gitignored, so clean -fd skips it; -x would take node_modules too.
rm -rf graph/probes

echo "→ baseline:"
git status --short
echo "done. run 'npm run verify' to confirm green."
