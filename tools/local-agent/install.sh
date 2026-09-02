#!/usr/bin/env bash
set -euo pipefail
repo="${GOVA_AGENT_REPO:-$(cd "$(dirname "$0")/../.." && pwd)}"
runtime_src="$repo/tools/local-agent"
mkdir -p /home/hesham/.local/lib/gova-agent /home/hesham/.local/bin /home/hesham/.config/gova-agent /home/hesham/.local/share/gova-agent-runtime /home/hesham/gova-agents /home/hesham/.local/share/applications
install -m 0755 "$runtime_src/gateway.py" /home/hesham/.local/lib/gova-agent/gateway.py
install -m 0755 "$runtime_src/cli.py" /home/hesham/.local/lib/gova-agent/cli.py
install -m 0755 "$runtime_src/monitor.py" /home/hesham/.local/lib/gova-agent/monitor.py
install -m 0755 "$runtime_src/recovery.py" /home/hesham/.local/lib/gova-agent/recovery.py
install -m 0755 "$runtime_src/git_credential.py" /home/hesham/.local/lib/gova-agent/git_credential.py
ln -sfn /home/hesham/.local/lib/gova-agent/cli.py /home/hesham/.local/bin/gova-agent
ln -sfn /home/hesham/.local/lib/gova-agent/monitor.py /home/hesham/.local/bin/gova-agent-monitor
# Git reads must not depend on stale desktop credentials. Publishing remains on
# the gateway's GitHub API path. Empty helper entries intentionally reset any
# inherited/global helpers, then the runtime helper resolves the local token at
# request time without persisting the token itself.
git -C "$repo" remote set-url origin https://github.com/printcode1000-lgtm/gova.git
git -C "$repo" config --local --unset-all credential.helper 2>/dev/null || true
git -C "$repo" config --local --unset-all credential.https://github.com.helper 2>/dev/null || true
git -C "$repo" config --local credential.helper ''
git -C "$repo" config --local --add credential.helper /home/hesham/.local/lib/gova-agent/git_credential.py
git -C "$repo" config --local credential.https://github.com.helper ''
git -C "$repo" config --local --add credential.https://github.com.helper /home/hesham/.local/lib/gova-agent/git_credential.py
# Retire the old @asol/local-agent-core watch process and replace its desktop
# launcher in-place. The new monitor is a read-only view of the persistent DB.
pkill -f 'scripts/local-agent-watch.ts' 2>/dev/null || true
cat > /home/hesham/.local/share/applications/gova-agent-monitor.desktop <<'DESKTOP'
[Desktop Entry]
Type=Application
Name=Gova Local Agent Monitor
Comment=Live local/cloud agent tasks, processes, worktrees and branches
Exec=/home/hesham/.local/bin/gova-agent-monitor
Icon=utilities-system-monitor
Terminal=true
Categories=Development;Monitor;
Keywords=gova;agents;codex;cloud;worktree;
DESKTOP
chmod 0644 /home/hesham/.local/share/applications/gova-agent-monitor.desktop
if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database /home/hesham/.local/share/applications >/dev/null 2>&1 || true
fi
if [ ! -s /home/hesham/.config/gova-agent/auth ]; then
  python3 - <<'AUTH'
from pathlib import Path
import secrets
p=Path('/home/hesham/.config/gova-agent/auth'); p.write_text(secrets.token_urlsafe(32)+'\n'); p.chmod(0o600)
AUTH
fi
if sudo -n true 2>/dev/null; then
  sudo install -m 0644 "$runtime_src/gova-agent-gateway.service" /etc/systemd/system/gova-agent-gateway.service
  sudo systemctl daemon-reload
  sudo systemctl enable gova-agent-gateway.service
  sudo systemctl restart gova-agent-gateway.service
else
  mkdir -p /home/hesham/.config/systemd/user
  sed '/^User=/d;s/WantedBy=multi-user.target/WantedBy=default.target/' "$runtime_src/gova-agent-gateway.service" > /home/hesham/.config/systemd/user/gova-agent-gateway.service
  systemctl --user daemon-reload
  systemctl --user enable gova-agent-gateway.service
  systemctl --user restart gova-agent-gateway.service
fi
