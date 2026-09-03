#!/usr/bin/env bash
set -euo pipefail

CF_BIN="${CLOUDFLARED_BIN:-/home/hesham/.local/bin/cloudflared}"
STATE_DIR="${GOVA_AGENT_TUNNEL_STATE:-/home/hesham/.local/state/gova-agent-tunnel}"
LOG="$STATE_DIR/cloudflared.log"
URL_FILE="$STATE_DIR/public-url"
TARGET="${GOVA_AGENT_TUNNEL_TARGET:-http://127.0.0.1:8765}"

mkdir -p "$STATE_DIR"
: > "$LOG"
rm -f "$URL_FILE"

set +e
"$CF_BIN" tunnel --url "$TARGET" --no-autoupdate 2>&1 | while IFS= read -r line; do
  printf '%s\n' "$line" >> "$LOG"
  url="$(printf '%s\n' "$line" | grep -Eo 'https://[A-Za-z0-9-]+\.trycloudflare\.com' | head -n1 || true)"
  if [ -n "$url" ]; then
    printf '%s\n' "$url" > "$URL_FILE.tmp"
    chmod 0600 "$URL_FILE.tmp"
    mv "$URL_FILE.tmp" "$URL_FILE"
  fi
done
exit ${PIPESTATUS[0]}
