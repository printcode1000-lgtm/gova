#!/usr/bin/env bash
set -euo pipefail
cd /home/hesham/gova
ver="$(node -p "require('./node_modules/esbuild/package.json').version")"
echo "repairing esbuild platform package version=$ver"
npm install --no-save --package-lock=false --ignore-scripts "@esbuild/linux-x64@$ver"
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
