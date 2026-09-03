#!/usr/bin/env bash
set -euo pipefail

CF_BIN="${CLOUDFLARED_BIN:-/home/hesham/.local/bin/cloudflared}"
STATE_DIR="${GOVA_AGENT_TUNNEL_STATE:-/home/hesham/.local/state/gova-agent-tunnel}"
LOG="$STATE_DIR/cloudflared.log"
URL_FILE="$STATE_DIR/public-url"
TARGET="${GOVA_AGENT_TUNNEL_TARGET:-http://127.0.0.1:8765}"
PUBLISHER="${GOVA_AGENT_R2_PUBLISHER:-/home/hesham/.local/lib/gova-agent/publish-public-url-r2.py}"

mkdir -p "$STATE_DIR"
: > "$LOG"
rm -f "$URL_FILE"

set +e
"$CF_BIN" tunnel --url "$TARGET" --no-autoupdate 2>&1 | while IFS= read -r line; do
  printf '%s\n' "$line" >> "$LOG"
  url="$(printf '%s\n' "$line" | grep -Eo 'https://[A-Za-z0-9-]+\.trycloudflare\.com' | head -n1 || true)"
  if [ -n "$url" ]; then
    previous="$(cat "$URL_FILE" 2>/dev/null || true)"
    if [ "$url" != "$previous" ]; then
      printf '%s\n' "$url" > "$URL_FILE.tmp"
      chmod 0600 "$URL_FILE.tmp"
      mv "$URL_FILE.tmp" "$URL_FILE"
      if [ -x "$PUBLISHER" ]; then
        "$PUBLISHER" >> "$STATE_DIR/r2-publish.log" 2>&1 || true
      fi
    fi
  fi
done
exit ${PIPESTATUS[0]}
