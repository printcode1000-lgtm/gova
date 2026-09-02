#!/usr/bin/env bash
set -euo pipefail
STATE=/home/hesham/.local/state/gova-agent-monitor
SERVICE=gova-agent-monitor-public.service
URL_FILE="$STATE/public-url"
mkdir -p "$STATE"
case "${1:-enable}" in
  enable)
    systemctl --user enable --now "$SERVICE" >/dev/null
    for _ in $(seq 1 120); do
      if [ -s "$URL_FILE" ]; then cat "$URL_FILE"; exit 0; fi
      sleep .25
    done
    echo 'public monitor URL was not created' >&2
    exit 1
    ;;
  restart)
    systemctl --user restart "$SERVICE"
    rm -f "$URL_FILE"
    for _ in $(seq 1 120); do
      if [ -s "$URL_FILE" ]; then cat "$URL_FILE"; exit 0; fi
      sleep .25
    done
    echo 'public monitor URL was not recreated' >&2
    exit 1
    ;;
  status)
    systemctl --user is-active "$SERVICE" || true
    [ -s "$URL_FILE" ] && cat "$URL_FILE"
    ;;
  disable)
    systemctl --user disable --now "$SERVICE" >/dev/null 2>&1 || true
    rm -f "$URL_FILE"
    ;;
  *) echo 'usage: gova-agent-monitor-public [enable|restart|status|disable]' >&2; exit 2;;
esac
