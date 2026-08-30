#!/usr/bin/env bash
# Git credential helper for the local agent control plane.
#
# Local agent jobs push from /home/hesham/gova and its worktrees rather than from
# a GitHub Actions checkout, so they have no job-scoped token to push with. This
# helper hands git the credential that already lives on the machine, reading it
# straight from .env.local rather than copying it into a second file.
#
# It only ever answers "get"; it never stores or erases anything, and it prints
# the token to git's credential protocol on stdout and nowhere else.
#
# Install once per clone:
#   git config --local credential.helper /home/hesham/gova/packages/local-agent-core/scripts/git-credential-local.sh
set -euo pipefail

[ "${1:-}" = "get" ] || exit 0

workspace="${GOVA_LOCAL_WORKSPACE:-/home/hesham/gova}"
token=""
for candidate in "$workspace/.env.local" "$workspace/.env"; do
  [ -r "$candidate" ] || continue
  token="$(sed -n 's/^GOVA_LOCAL_DISPATCH_TOKEN=//p;s/^GITHUB_ADMIN_TOKEN=//p' "$candidate" | head -1 | tr -d '"'"'"'')"
  [ -n "$token" ] && break
done

[ -n "$token" ] || exit 0

echo "username=x-access-token"
echo "password=$token"
