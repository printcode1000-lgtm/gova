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
if ! node -e "require.resolve('@esbuild/linux-x64/package.json')" >/dev/null 2>&1; then
  ver="$(node -p "require('./node_modules/esbuild/package.json').version")"
  npm install --no-save --package-lock=false --ignore-scripts "@esbuild/linux-x64@$ver"
fi
npx tsx -e 'console.log("tsx-runtime-ok")'
npm run local-agent:direct:install
sleep 4
echo '--- service ---'
systemctl --user is-enabled gova-direct-agent.service
systemctl --user is-active gova-direct-agent.service
systemctl --user show gova-direct-agent.service -p MainPID -p ActiveState -p SubState
echo '--- doctor ---'
npm run local-agent:direct:doctor || true
echo '--- direct status over authenticated transport ---'
npm run local-agent:direct:remote -- status
echo '--- direct exec over authenticated transport ---'
npm run local-agent:direct:remote -- exec -- 'printf DIRECT_P2P_EXEC_OK; printf "\n"; pwd; git rev-parse --short HEAD'
