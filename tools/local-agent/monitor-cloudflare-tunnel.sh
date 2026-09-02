#!/usr/bin/env bash
set -euo pipefail
BIN=/home/hesham/.local/bin/cloudflared
STATE=/home/hesham/.local/state/gova-agent-monitor
LOG="$STATE/cloudflared.log"
URL_FILE="$STATE/public-url"
mkdir -p "$STATE"
: > "$LOG"
rm -f "$URL_FILE"
set +e
"$BIN" tunnel --url http://127.0.0.1:8766 --no-autoupdate 2>&1 | while IFS= read -r line; do
  printf '%s\n' "$line" >> "$LOG"
  url="$(printf '%s\n' "$line" | grep -Eo 'https://[A-Za-z0-9-]+\.trycloudflare\.com' | head -n1 || true)"
  if [ -n "$url" ]; then
    printf '%s\n' "$url" > "$URL_FILE.tmp"
    chmod 0600 "$URL_FILE.tmp"
    mv "$URL_FILE.tmp" "$URL_FILE"
  fi
done
exit ${PIPESTATUS[0]}
