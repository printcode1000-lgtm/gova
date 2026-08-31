#!/usr/bin/env bash
set -euo pipefail
root=/home/hesham/gova
git -C "$root" fetch --quiet origin main
test -z "$(git -C "$root" status --porcelain --untracked-files=no)" || { echo canonical-tracked-state-dirty; exit 1; }
git -C "$root" checkout -q main
git -C "$root" reset --hard origin/main
cd "$root"
printf 'canonicalHead=%s\n' "$(git rev-parse HEAD)"
GOVA_DIRECT_SERVICE_WORKSPACE="$root" npm run -s local-agent:direct:install
for i in $(seq 1 20); do
  state=$(systemctl --user is-active gova-direct-agent.service 2>/dev/null || true)
  [ "$state" = active ] && break
  sleep 1
done
printf '%s\n' '--- SYSTEMD ---'
systemctl --user is-enabled gova-direct-agent.service
systemctl --user is-active gova-direct-agent.service
systemctl --user show gova-direct-agent.service -p ActiveState -p SubState -p MainPID -p NRestarts --no-pager
printf '%s\n' '--- UNIT/ENV PATHS ---'
systemctl --user cat gova-direct-agent.service | grep -E 'WorkingDirectory=|EnvironmentFile=' || true
stat -c 'envMode=%a envPath=%n' /home/hesham/gova/.local/direct-agent/service.env
printf '%s\n' '--- LISTENER ---'
ss -lntp | grep ':48732'
printf '%s\n' '--- DOCTOR ---'
npm run -s local-agent:direct:doctor
printf '%s\n' '--- RESTART TEST ---'
systemctl --user restart gova-direct-agent.service
for i in $(seq 1 20); do
  state=$(systemctl --user is-active gova-direct-agent.service 2>/dev/null || true)
  [ "$state" = active ] && break
  sleep 1
done
systemctl --user is-active gova-direct-agent.service
npm run -s local-agent:direct:doctor
printf '%s\n' '--- R2 REFRESH STATE ---'
node -e 'const fs=require("fs");const p="/home/hesham/gova/.local/direct-agent/state.json";const x=JSON.parse(fs.readFileSync(p,"utf8")); console.log(JSON.stringify({running:x.running,port:x.port,discoveryLastPublishedAt:x.discoveryLastPublishedAt,bootstrapLastCycleAt:x.bootstrapLastCycleAt,lastError:x.lastError})); if(!x.discoveryLastPublishedAt) process.exit(2)'
printf '%s\n' '--- JOURNAL TAIL ---'
journalctl --user -u gova-direct-agent.service -n 20 --no-pager | sed -E 's/(password|token|secret)[=:][^ ]+/\1=[REDACTED]/Ig'
