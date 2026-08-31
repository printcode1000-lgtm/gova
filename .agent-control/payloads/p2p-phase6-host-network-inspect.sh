#!/usr/bin/env bash
set -euo pipefail
cd /home/hesham/gova
git fetch --quiet origin main
printf 'HEAD=%s\n' "$(git rev-parse HEAD)"
printf 'ORIGIN_MAIN=%s\n' "$(git rev-parse origin/main)"
printf 'NODE=%s\n' "$(node --version)"
printf 'NPM=%s\n' "$(npm --version)"
printf 'WERIFT=%s\n' "$(npm view werift version 2>/dev/null || echo unavailable)"
printf 'LINGER=%s\n' "$(loginctl show-user hesham -p Linger --value 2>/dev/null || echo unknown)"
printf 'SYSTEMD_USER=%s\n' "$(systemctl --user is-system-running 2>/dev/null || true)"
echo '--- USER UNITS ---'
systemctl --user list-unit-files --no-pager | grep -E 'gova|asol|runner|discover|direct' || true
echo '--- LISTENERS ---'
ss -lntup | grep -E '4873[0-9]|48731|48732|41641' || true
echo '--- ADDRESSES ---'
ip -brief address show | sed -E 's/[[:space:]]+/ /g'
echo '--- ROUTES ---'
ip route show default || true
ip -6 route show default || true
echo '--- TAILSCALE ---'
if command -v tailscale >/dev/null 2>&1; then
  tailscale status --json 2>/dev/null | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const x=JSON.parse(s);console.log(JSON.stringify({BackendState:x.BackendState,Self:{TailscaleIPs:x.Self?.TailscaleIPs,Online:x.Self?.Online},PeerCount:Object.keys(x.Peer||{}).length}))}catch{console.log("tailscale-json-unavailable")}})'
else
  echo unavailable
fi
echo '--- ENV FILE NAMES ---'
find /home/hesham/gova /home/hesham/.config -maxdepth 3 -type f \( -name '*.env' -o -name '.env*' -o -name '*r2*.env' \) -printf '%p\n' 2>/dev/null | sed 's#^/home/hesham/#~/#' | head -50
echo '--- DIRECT STATE ---'
find /home/hesham/gova/.local/direct-agent -maxdepth 3 -printf '%M %p\n' 2>/dev/null | head -80 || true
echo '--- STUN DRY PROBE ---'
npx tsx -e 'import {discoverStunMappedEndpoint} from "@asol/local-agent-core/direct"; const x=await discoverStunMappedEndpoint(); console.log(JSON.stringify({stunReachable:Boolean(x),mappedIp:x?.ip??null,mappedPort:x?.port??null}));'
