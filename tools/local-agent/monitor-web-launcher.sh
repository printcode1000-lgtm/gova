#!/usr/bin/env bash
set -euo pipefail
URL="http://127.0.0.1:8766/"
STATE="/home/hesham/.local/state/gova-agent-monitor"
LOG="$STATE/web-launcher.log"
mkdir -p "$STATE"
exec >>"$LOG" 2>&1
printf '[%s] launch HTML monitor\n' "$(date -Is)"

# The monitor service is user-scoped and read-only. Start it if the desktop
# session was restored before systemd had started the service.
systemctl --user start gova-agent-monitor-web.service || true

ready=false
for _ in $(seq 1 50); do
  if /usr/bin/python3 - <<'PY' >/dev/null 2>&1
import urllib.request
with urllib.request.urlopen('http://127.0.0.1:8766/health', timeout=0.35) as r:
    raise SystemExit(0 if r.status == 200 else 1)
PY
  then
    ready=true
    break
  fi
  sleep 0.1
done
if [ "$ready" != true ]; then
  echo "HTML monitor service is not ready"
  systemctl --user status gova-agent-monitor-web.service --no-pager || true
  exit 1
fi

# Open as a standalone application window. No browser verification is performed.
if command -v google-chrome >/dev/null 2>&1; then
  exec google-chrome --app="$URL" --class=GovaLocalAgentsMonitor --user-data-dir=/home/hesham/.local/share/gova-agent-monitor-chrome
elif command -v google-chrome-stable >/dev/null 2>&1; then
  exec google-chrome-stable --app="$URL" --class=GovaLocalAgentsMonitor --user-data-dir=/home/hesham/.local/share/gova-agent-monitor-chrome
elif command -v chromium >/dev/null 2>&1; then
  exec chromium --app="$URL" --class=GovaLocalAgentsMonitor --user-data-dir=/home/hesham/.local/share/gova-agent-monitor-chrome
else
  exec xdg-open "$URL"
fi
