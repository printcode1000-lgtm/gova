#!/usr/bin/env bash
set -euo pipefail
root=/home/hesham/gova
git -C "$root" fetch origin main
if [ -n "$(git -C "$root" status --porcelain --untracked-files=no)" ]; then
  echo 'canonical workspace has tracked changes; refusing destructive sync' >&2
  git -C "$root" status --short
  exit 2
fi
git -C "$root" reset --hard origin/main
cd "$root"
echo "HEAD=$(git rev-parse HEAD)"
npm run local-agent:direct:install
sleep 3
systemctl --user status gova-direct-agent.service --no-pager --full || true
npm run local-agent:direct:doctor || true
echo '--- listeners ---'
ss -lntup | grep -E '48731|48732|gova|node' || true
