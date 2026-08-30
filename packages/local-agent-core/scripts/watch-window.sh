#!/usr/bin/env bash
# Open the local agent monitor in its own window.
#
# The monitor itself is an ordinary terminal program, which is what lets it work
# over SSH and inside tmux as well as on this desktop. This wrapper is only about
# giving it a window of its own: it picks the first terminal emulator that is
# actually installed, sizes and titles it, and detaches so the calling shell is
# free immediately.
#
#   watch-window.sh                    open the monitor in a new window
#   watch-window.sh --install-desktop  add a launcher to the applications menu
#   watch-window.sh -- --offline       pass flags through to the monitor
set -euo pipefail

WORKSPACE="${GOVA_LOCAL_WORKSPACE:-/home/hesham/gova}"
TITLE="Gova Local Agent Monitor"
DESKTOP_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/applications"
DESKTOP_FILE="$DESKTOP_DIR/gova-agent-monitor.desktop"

if [ "${1:-}" = "--install-desktop" ]; then
  mkdir -p "$DESKTOP_DIR"
  cat > "$DESKTOP_FILE" <<EOF
[Desktop Entry]
Type=Application
Name=$TITLE
Comment=Live, read-only view of the Gova local agent control plane
Exec=$WORKSPACE/packages/local-agent-core/scripts/watch-window.sh
Icon=utilities-system-monitor
Terminal=false
Categories=Development;Monitor;
Keywords=gova;agents;runners;
EOF
  chmod 644 "$DESKTOP_FILE"
  command -v update-desktop-database >/dev/null && update-desktop-database "$DESKTOP_DIR" 2>/dev/null || true
  echo "Installed $DESKTOP_FILE"
  exit 0
fi

# Everything after `--` belongs to the monitor, not to this wrapper.
MONITOR_ARGS=()
if [ "${1:-}" = "--" ]; then
  shift
  MONITOR_ARGS=("$@")
fi

COMMAND="cd $(printf '%q' "$WORKSPACE") && npm run --silent local-agent:watch --"
for arg in ${MONITOR_ARGS+"${MONITOR_ARGS[@]}"}; do
  COMMAND="$COMMAND $(printf '%q' "$arg")"
done

if command -v gnome-terminal >/dev/null; then
  exec gnome-terminal --title="$TITLE" --geometry=140x45 -- bash -lc "$COMMAND"
elif command -v konsole >/dev/null; then
  exec konsole -p "tabtitle=$TITLE" -e bash -lc "$COMMAND"
elif command -v xfce4-terminal >/dev/null; then
  exec xfce4-terminal --title="$TITLE" --geometry=140x45 -e "bash -lc \"$COMMAND\""
elif command -v x-terminal-emulator >/dev/null; then
  exec x-terminal-emulator -T "$TITLE" -e bash -lc "$COMMAND"
elif command -v xterm >/dev/null; then
  exec xterm -T "$TITLE" -geometry 140x45 -e bash -lc "$COMMAND"
fi

echo "No terminal emulator found. Run the monitor directly:" >&2
echo "  npm run local-agent:watch" >&2
exit 1
