#!/usr/bin/env bash
set -euo pipefail
root=/home/hesham/gova
git -C "$root" fetch --quiet origin main
test -z "$(git -C "$root" status --porcelain --untracked-files=no)" || { echo canonical-tracked-state-dirty; exit 1; }
git -C "$root" checkout -q main
git -C "$root" reset --hard origin/main
printf 'canonicalHead=%s\n' "$(git -C "$root" rev-parse HEAD)"
printf 'originMain=%s\n' "$(git -C "$root" rev-parse origin/main)"
