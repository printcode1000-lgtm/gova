#!/usr/bin/env bash
set -u
unset RUNNER_TRACKING_ID 2>/dev/null || true
STATE=/home/hesham/.local/state/gova-agent-monitor
LOG="$STATE/launcher.log"
mkdir -p "$STATE"
: > "$LOG"
exec >>"$LOG" 2>&1
echo "[$(date -Is)] single-window launcher start"
export GOVA_AGENT_REPO=/home/hesham/gova
export GOVA_AGENT_RUNTIME=/home/hesham/.local/share/gova-agent-runtime
export GOVA_AGENT_WORKTREES=/home/hesham/gova-agents
export TERM="${TERM:-xterm-256color}"
MONITOR=/home/hesham/.local/lib/gova-agent/monitor.py
if [ ! -f "$MONITOR" ]; then
  echo "monitor missing: $MONITOR"
  exit 1
fi
if command -v gnome-terminal >/dev/null 2>&1; then
  exec gnome-terminal --window --title="Gova Local Execution Monitor" -- /usr/bin/python3 "$MONITOR" --view dashboard
elif command -v x-terminal-emulator >/dev/null 2>&1; then
  exec x-terminal-emulator -T "Gova Local Execution Monitor" -e /usr/bin/python3 "$MONITOR" --view dashboard
fi
echo "No graphical terminal found"
exit 1
