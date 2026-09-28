#!/usr/bin/env bash
# PreToolUse (Bash): block shell commands that would mutate protected paths
# indirectly (redirects, sed -i, mv/cp, rm), bypassing the file-tool guard,
# and git operations that bypass the hooks or land on main.
# The permission deny list matches literal patterns only; this closes the gap.
set -u

command -v jq >/dev/null 2>&1 || exit 0

cmd=$(jq -r '.tool_input.command // empty' 2>/dev/null) || exit 0
[ -n "$cmd" ] || exit 0

block() {
  echo "BLOCKED: $1" >&2
  exit 2
}

protected='(\.env[^ ]*|\.husky/|docs/specs/|\.claude/)'

# A worktree lives at .claude/worktrees/<name>/, so an absolute path into one
# would match the .claude/ rule for every file it holds. Strip that prefix so
# the remainder is judged as a repo-relative path — the worktree's own .claude/
# is still caught, its src/ and graph/ are not.
cmd=$(printf '%s' "$cmd" | sed -E 's#\.claude/worktrees/[^/]+/##g')

if echo "$cmd" | grep -qE "(>|>>)[[:space:]]*[^ ]*$protected"; then
  block "shell redirect targets a protected path."
fi
if echo "$cmd" | grep -qE "(sed[[:space:]]+(-[a-zA-Z]*i|--in-place)|tee[[:space:]]).*$protected"; then
  block "in-place edit of a protected path via shell."
fi
if echo "$cmd" | grep -qE "(mv|cp|rm)[[:space:]].*$protected"; then
  block "mv/cp/rm on a protected path."
fi

# git commit: the hooks are the gate; skipping them is never allowed.
if echo "$cmd" | grep -qE "git[[:space:]]+commit.*--no-verify"; then
  block "--no-verify skips the commit hooks. Fix the failure instead."
fi

# git push: feature branches are allowed (the permission layer asks); pushing
# to main/master or force-pushing is never allowed.
if echo "$cmd" | grep -qE "git[[:space:]]+push"; then
  if echo "$cmd" | grep -qE "git[[:space:]]+push.*[[:space:]:](main|master)([[:space:]]|$|:)"; then
    block "pushing to main/master is not allowed. Push a feature branch and open a PR."
  fi
  if echo "$cmd" | grep -qE "git[[:space:]]+push.*([[:space:]]--force(-with-lease(=[^[:space:]]*)?)?([[:space:]]|$)|[[:space:]]-f([[:space:]]|$))"; then
    block "force-push is not allowed."
  fi
  if echo "$cmd" | grep -qE "git[[:space:]]+push([[:space:]]+-[^[:space:]]+)*[[:space:]]*$"; then
    # Ask the command's cwd, not this script's location: the script lives in
    # the main checkout, but inside a lane the session is on the lane's branch.
    branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
    case "$branch" in
      main|master) block "you are on $branch; bare 'git push' would push it. Create a feature branch first." ;;
    esac
  fi
fi

exit 0
