#!/usr/bin/env bash
set -euo pipefail
root=/home/hesham/gova
git -C "$root" fetch --quiet origin main
test -z "$(git -C "$root" status --porcelain --untracked-files=no)" || { echo canonical-tracked-state-dirty; exit 1; }
git -C "$root" checkout -q main
git -C "$root" reset --hard origin/main
cd "$root"
printf 'canonicalHead=%s\n' "$(git rev-parse HEAD)"
npm run -s local-agent:direct:install
sleep 3
printf '%s\n' '--- SYSTEMD ---'
systemctl --user is-enabled gova-direct-agent.service
systemctl --user is-active gova-direct-agent.service
systemctl --user show gova-direct-agent.service -p ActiveState -p SubState -p MainPID -p NRestarts --no-pager
printf '%s\n' '--- LISTENER ---'
ss -lntp | grep ':48732' || true
printf '%s\n' '--- STATUS ---'
npm run -s local-agent:direct:status
printf '%s\n' '--- DOCTOR ---'
npm run -s local-agent:direct:doctor
printf '%s\n' '--- RESTART TEST ---'
systemctl --user restart gova-direct-agent.service
sleep 3
systemctl --user is-active gova-direct-agent.service
npm run -s local-agent:direct:doctor
printf '%s\n' '--- JOURNAL TAIL ---'
journalctl --user -u gova-direct-agent.service -n 25 --no-pager | sed -E 's/(password|token|secret|key)[=:][^ ]+/\1=[REDACTED]/Ig'
