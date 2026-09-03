#!/usr/bin/env bash
set -euo pipefail

CF_BIN="${CLOUDFLARED_BIN:-/home/hesham/.local/bin/cloudflared}"
STATE_DIR="${GOVA_AGENT_TUNNEL_STATE:-/home/hesham/.local/state/gova-agent-tunnel}"
LOG="$STATE_DIR/cloudflared.log"
MCP_LOG="$STATE_DIR/mcp-bridge.log"
URL_FILE="$STATE_DIR/public-url"
MCP_BRIDGE="${GOVA_AGENT_MCP_BRIDGE:-/home/hesham/.local/lib/gova-agent/mcp_bridge.py}"
TARGET="${GOVA_AGENT_TUNNEL_TARGET:-http://127.0.0.1:8767}"
PUBLISHER="${GOVA_AGENT_R2_PUBLISHER:-/home/hesham/.local/lib/gova-agent/publish-public-url-r2.py}"

mkdir -p "$STATE_DIR"
: > "$LOG"
: > "$MCP_LOG"
rm -f "$URL_FILE"

/usr/bin/python3 "$MCP_BRIDGE" >> "$MCP_LOG" 2>&1 &
MCP_PID=$!
cleanup() {
  kill "$MCP_PID" 2>/dev/null || true
  wait "$MCP_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

for _ in $(seq 1 80); do
  if curl -fsS --max-time 1 http://127.0.0.1:8767/health >/dev/null 2>&1; then
    break
  fi
  if ! kill -0 "$MCP_PID" 2>/dev/null; then
    echo 'MCP bridge exited before becoming ready' >&2
    tail -n 50 "$MCP_LOG" >&2 || true
    exit 1
  fi
  sleep .1
done
if ! curl -fsS --max-time 1 http://127.0.0.1:8767/health >/dev/null 2>&1; then
  echo 'MCP bridge did not become ready' >&2
  exit 1
fi

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
