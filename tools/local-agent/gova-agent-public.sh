#!/usr/bin/env bash
set -euo pipefail

SERVICE=gova-agent-public.service
STATE_DIR="${GOVA_AGENT_TUNNEL_STATE:-/home/hesham/.local/state/gova-agent-tunnel}"
URL_FILE="$STATE_DIR/public-url"
LOG_FILE="$STATE_DIR/cloudflared.log"
R2_LOG="$STATE_DIR/r2-publish.log"
PUBLISHER="${GOVA_AGENT_R2_PUBLISHER:-/home/hesham/.local/lib/gova-agent/publish-public-url-r2.py}"
R2_ENV="${GOVA_AGENT_R2_ENV:-/home/hesham/.config/gova-agent/r2.env}"

wait_url() {
  mkdir -p "$STATE_DIR"
  for _ in $(seq 1 120); do
    if [ -s "$URL_FILE" ]; then
      cat "$URL_FILE"
      return 0
    fi
    sleep .25
  done
  echo "public tunnel URL was not created" >&2
  return 1
}

case "${1:-start}" in
  start|enable)
    systemctl --user enable --now "$SERVICE" >/dev/null
    wait_url
    ;;
  restart)
    rm -f "$URL_FILE"
    systemctl --user restart "$SERVICE"
    wait_url
    ;;
  stop|disable)
    systemctl --user disable --now "$SERVICE" >/dev/null 2>&1 || true
    rm -f "$URL_FILE"
    ;;
  status)
    active="$(systemctl --user is-active "$SERVICE" 2>/dev/null || true)"
    printf 'service=%s\n' "${active:-unknown}"
    if [ -s "$URL_FILE" ]; then
      printf 'url='; cat "$URL_FILE"
    else
      printf 'url=unavailable\n'
    fi
    if [ -s "$R2_ENV" ]; then printf 'r2=configured\n'; else printf 'r2=not-configured\n'; fi
    ;;
  url)
    if [ -s "$URL_FILE" ]; then cat "$URL_FILE"; else echo "URL not available" >&2; exit 1; fi
    ;;
  health)
    url="$(cat "$URL_FILE" 2>/dev/null || true)"
    if [ -z "$url" ]; then echo "URL not available" >&2; exit 1; fi
    curl -fsS --max-time 10 "$url/health"
    printf '\n'
    ;;
  publish)
    exec "$PUBLISHER"
    ;;
  logs)
    tail -n "${2:-100}" "$LOG_FILE" 2>/dev/null || true
    ;;
  r2-logs)
    tail -n "${2:-100}" "$R2_LOG" 2>/dev/null || true
    ;;
  *)
    echo 'usage: gova-agent-public [start|restart|stop|status|url|health|publish|logs|r2-logs]' >&2
    exit 2
    ;;
esac
