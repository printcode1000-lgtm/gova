#!/usr/bin/env bash
# Runner-side cloud Mode-B projection.
#
# The cloud agent edits in its own checkout and delivers through Git: it pushes a
# verified commit to `integration`, then dispatches `local-agent-project.yml`.
# This script is what that dispatch runs on the machine. It re-verifies the commit
# here — the canonical toolchain, not the cloud one — and only then asks the local
# Gateway to project it, unstaged, into /home/hesham/gova.
#
# Nothing here reaches the Gateway over a network, consumes a GitHub secret, or
# touches `main`. Verification failure means no projection at all.
set -euo pipefail

REPO="${GOVA_AGENT_REPO:-/home/hesham/gova}"
VERIFY_TREE="${GOVA_AGENT_VERIFY_WORKTREE:-/home/hesham/gova-agents/verify}"
CLI="${GOVA_AGENT_CLI:-/home/hesham/.local/bin/gova-agent}"
AGENT_ID="${AGENT_ID:?AGENT_ID is required}"
TASK_ID="${TASK_ID:?TASK_ID is required}"
TASK_GOAL="${TASK_GOAL:?TASK_GOAL is required}"
INTEGRATION_SHA="${INTEGRATION_SHA:?INTEGRATION_SHA is required}"

if ! [[ "$INTEGRATION_SHA" =~ ^[0-9a-f]{40}$ ]]; then
  echo "INTEGRATION_SHA must be a full 40-character commit SHA" >&2
  exit 1
fi

git -C "$REPO" fetch --prune origin integration
if ! git -C "$REPO" merge-base --is-ancestor "$INTEGRATION_SHA" origin/integration; then
  echo "$INTEGRATION_SHA is not published on origin/integration; push the verified commit there first" >&2
  exit 1
fi

# A detached verification worktree keeps the canonical checkout — including the
# user's uncommitted work — untouched while the commit is being judged. It reuses
# the canonical dependency tree by symlink, the same way managed task worktrees do.
mkdir -p "$(dirname "$VERIFY_TREE")"
if [ -e "$VERIFY_TREE/.git" ]; then
  git -C "$VERIFY_TREE" reset --hard "$INTEGRATION_SHA"
  git -C "$VERIFY_TREE" clean -fd
else
  git -C "$REPO" worktree add --detach "$VERIFY_TREE" "$INTEGRATION_SHA"
fi
if [ ! -e "$VERIFY_TREE/node_modules" ] && [ -d "$REPO/node_modules" ]; then
  ln -s "$REPO/node_modules" "$VERIFY_TREE/node_modules"
fi

cd "$VERIFY_TREE"
export DOCS_CI_BASE_REF="${INTEGRATION_SHA}^"
npm run architecture:check
npm run docs:ci

# The resolver runs from the canonical checkout, never from the tree being
# judged: a commit must not get to decide which suites are run against it,
# and a commit branched from an older `integration` would not carry the
# resolver at all. The gate's own logic stays the reviewed version on `main`.
suites="$(cd "$REPO" && npx tsx scripts/local-agent/related-core-tests.ts "${INTEGRATION_SHA}^" "$INTEGRATION_SHA")"
echo "related core suites: ${suites:-(none)}"
while IFS= read -r suite; do
  [ -n "$suite" ] || continue
  npm run "$suite"
done <<< "$suites"

"$CLI" register "$AGENT_ID"
if ! "$CLI" task-status "$TASK_ID" >/dev/null 2>&1; then
  "$CLI" task-create "$AGENT_ID" "$TASK_GOAL" --task-id "$TASK_ID" --mode B --cloud-bridge
fi
"$CLI" project "$AGENT_ID" "$TASK_ID" "$INTEGRATION_SHA"
