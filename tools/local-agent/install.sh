#!/usr/bin/env bash
set -euo pipefail
repo="${GOVA_AGENT_REPO:-$(cd "$(dirname "$0")/../.." && pwd)}"
runtime_src="$repo/tools/local-agent"
mkdir -p \
  /home/hesham/.local/lib/gova-agent/web \
  /home/hesham/.local/bin \
  /home/hesham/.config/gova-agent \
  /home/hesham/.config/systemd/user \
  /home/hesham/.local/share/gova-agent-runtime \
  /home/hesham/.local/state/gova-agent-monitor \
  /home/hesham/.local/state/gova-agent-tunnel \
  /home/hesham/.local/share/applications \
  /home/hesham/gova-agents
install -m 0755 "$runtime_src/gateway.py" /home/hesham/.local/lib/gova-agent/gateway.py
rm -f /home/hesham/.local/lib/gova-agent/mcp_bridge.py
install -m 0755 "$runtime_src/cli.py" /home/hesham/.local/lib/gova-agent/cli.py
install -m 0755 "$runtime_src/monitor.py" /home/hesham/.local/lib/gova-agent/monitor.py
install -m 0755 "$runtime_src/monitor-launcher.sh" /home/hesham/.local/lib/gova-agent/monitor-launcher.sh
install -m 0755 "$runtime_src/web_monitor.py" /home/hesham/.local/lib/gova-agent/web_monitor.py
install -m 0755 "$runtime_src/monitor-web-launcher.sh" /home/hesham/.local/lib/gova-agent/monitor-web-launcher.sh
install -m 0755 "$runtime_src/monitor-public.sh" /home/hesham/.local/lib/gova-agent/monitor-public.sh
install -m 0755 "$runtime_src/monitor-cloudflare-tunnel.sh" /home/hesham/.local/lib/gova-agent/monitor-cloudflare-tunnel.sh
install -m 0755 "$runtime_src/gateway-quick-tunnel.sh" /home/hesham/.local/lib/gova-agent/gateway-quick-tunnel.sh
install -m 0755 "$runtime_src/gova-agent-public.sh" /home/hesham/.local/lib/gova-agent/gova-agent-public.sh
install -m 0755 "$runtime_src/publish-public-url-r2.py" /home/hesham/.local/lib/gova-agent/publish-public-url-r2.py
install -m 0644 "$runtime_src/web/index.html" /home/hesham/.local/lib/gova-agent/web/index.html
install -m 0755 "$runtime_src/project_watch.py" /home/hesham/.local/lib/gova-agent/project_watch.py
install -m 0755 "$runtime_src/recovery.py" /home/hesham/.local/lib/gova-agent/recovery.py
install -m 0755 "$runtime_src/git_credential.py" /home/hesham/.local/lib/gova-agent/git_credential.py
ln -sfn /home/hesham/.local/lib/gova-agent/cli.py /home/hesham/.local/bin/gova-agent
ln -sfn /home/hesham/.local/lib/gova-agent/monitor.py /home/hesham/.local/bin/gova-agent-monitor
ln -sfn /home/hesham/.local/lib/gova-agent/monitor-launcher.sh /home/hesham/.local/bin/gova-agent-monitor-launcher
ln -sfn /home/hesham/.local/lib/gova-agent/monitor-web-launcher.sh /home/hesham/.local/bin/gova-agent-monitor-web
ln -sfn /home/hesham/.local/lib/gova-agent/monitor-public.sh /home/hesham/.local/bin/gova-agent-monitor-public
ln -sfn /home/hesham/.local/lib/gova-agent/gova-agent-public.sh /home/hesham/.local/bin/gova-agent-public

git -C "$repo" remote set-url origin https://github.com/printcode1000-lgtm/gova.git
git -C "$repo" config --local --unset-all credential.helper 2>/dev/null || true
git -C "$repo" config --local --unset-all credential.https://github.com.helper 2>/dev/null || true
git -C "$repo" config --local credential.helper ''
git -C "$repo" config --local --add credential.helper /home/hesham/.local/lib/gova-agent/git_credential.py
git -C "$repo" config --local credential.https://github.com.helper ''
git -C "$repo" config --local --add credential.https://github.com.helper /home/hesham/.local/lib/gova-agent/git_credential.py

pkill -f 'scripts/local-agent-watch.ts' 2>/dev/null || true
cat > /home/hesham/.local/share/applications/gova-local-agents-monitor.desktop <<'DESKTOP'
[Desktop Entry]
Type=Application
Name=Gova Local Agents Monitor
Name[ar]=مراقب وكلاء Gova المحلي
Comment=Arabic local dashboard for agents, GitHub runners, jobs, gateway, worktrees and logs
Comment[ar]=لوحة عربية محلية لمراقبة الوكلاء وGitHub Runner والمهام والـGateway والسجلات
Exec=/home/hesham/.local/bin/gova-agent-monitor-web
Icon=utilities-system-monitor
Terminal=false
Categories=Development;
Keywords=gova;agents;runner;github;jobs;gateway;worktree;logs;monitor;
StartupNotify=true
DESKTOP
chmod 0644 /home/hesham/.local/share/applications/gova-local-agents-monitor.desktop
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
  sed '/^User=/d;s/WantedBy=multi-user.target/WantedBy=default.target/' "$runtime_src/gova-agent-gateway.service" > /home/hesham/.config/systemd/user/gova-agent-gateway.service
  systemctl --user daemon-reload
  systemctl --user enable gova-agent-gateway.service
  systemctl --user restart gova-agent-gateway.service
fi

install -m 0644 "$runtime_src/gova-agent-monitor-web.service" /home/hesham/.config/systemd/user/gova-agent-monitor-web.service
install -m 0644 "$runtime_src/gova-agent-project-watch.service" /home/hesham/.config/systemd/user/gova-agent-project-watch.service
install -m 0644 "$runtime_src/gova-agent-project-watch.timer" /home/hesham/.config/systemd/user/gova-agent-project-watch.timer
install -m 0644 "$runtime_src/gova-agent-public.service" /home/hesham/.config/systemd/user/gova-agent-public.service
systemctl --user daemon-reload
systemctl --user enable gova-agent-monitor-web.service
systemctl --user restart gova-agent-monitor-web.service
systemctl --user enable gova-agent-project-watch.timer
systemctl --user restart gova-agent-project-watch.timer
systemctl --user enable gova-agent-public.service >/dev/null 2>&1 || true
systemctl --user restart gova-agent-public.service >/dev/null 2>&1 || true

for _ in $(seq 1 160); do
  if python3 - <<'HEALTH' >/dev/null 2>&1
import urllib.request
for url in ('http://127.0.0.1:8765/health', 'http://127.0.0.1:8766/health'):
    with urllib.request.urlopen(url, timeout=0.5) as r:
        if r.status != 200:
            raise SystemExit(1)
HEALTH
  then
    if [ -s /home/hesham/.local/state/gova-agent-tunnel/public-url ]; then
      exit 0
    fi
  fi
  sleep 0.25
done

echo 'gova-agent services or public tunnel did not become ready after restart' >&2
if sudo -n true 2>/dev/null; then
  sudo systemctl status gova-agent-gateway.service --no-pager || true
else
  systemctl --user status gova-agent-gateway.service --no-pager || true
fi
systemctl --user status gova-agent-monitor-web.service --no-pager || true
systemctl --user status gova-agent-public.service --no-pager || true
exit 1
