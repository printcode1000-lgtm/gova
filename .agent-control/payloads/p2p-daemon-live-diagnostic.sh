#!/usr/bin/env bash
set -euo pipefail
cd /home/hesham/gova
echo '--- SERVICE ---'
systemctl --user show gova-direct-agent.service -p ActiveState -p SubState -p MainPID -p NRestarts -p ExecMainStatus --no-pager || true
echo '--- EXPECTED PORT ---'
npx tsx -e 'import {resolveDirectAgentPort} from "@asol/local-agent-core/direct"; console.log(resolveDirectAgentPort())' || true
echo '--- LISTENERS ---'
ss -lntp | grep -E ':4873[0-9]' || true
echo '--- STATE SAFE FIELDS ---'
node - <<'NODE'
const fs=require('fs'); const p='/home/hesham/gova/.local/direct-agent/state.json';
if(!fs.existsSync(p)){console.log('state-missing');process.exit(0)}
const x=JSON.parse(fs.readFileSync(p,'utf8'));
console.log(JSON.stringify({schemaVersion:x.schemaVersion,pid:x.pid,running:x.running,hostId:x.hostId,port:x.port,bindHost:x.bindHost,startedAt:x.startedAt,updatedAt:x.updatedAt,discoveryLastPublishedAt:x.discoveryLastPublishedAt,bootstrapLastCycleAt:x.bootstrapLastCycleAt,lastError:x.lastError},null,2));
NODE
echo '--- PROCESS ---'
pid=$(systemctl --user show gova-direct-agent.service -p MainPID --value 2>/dev/null || echo 0)
if [ "${pid:-0}" -gt 0 ]; then ps -o pid,ppid,etimes,stat,comm -p "$pid"; fi
echo '--- JOURNAL SAFE TAIL ---'
journalctl --user -u gova-direct-agent.service -n 60 --no-pager | sed -E 's/(password|passwd|token|secret|api[_-]?key)[=:][^ ]+/\1=[REDACTED]/Ig' | sed -E 's/(gh[pousr]_[A-Za-z0-9]{10,}|github_pat_[A-Za-z0-9_]{10,})/[REDACTED]/g'
