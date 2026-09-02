#!/usr/bin/env bash
set -euo pipefail
repo="${GOVA_AGENT_REPO:-$(cd "$(dirname "$0")/../.." && pwd)}"
runtime_src="$repo/tools/local-agent"
mkdir -p /home/hesham/.local/lib/gova-agent /home/hesham/.local/bin /home/hesham/.config/gova-agent /home/hesham/.local/share/gova-agent-runtime /home/hesham/gova-agents
install -m 0755 "$runtime_src/gateway.py" /home/hesham/.local/lib/gova-agent/gateway.py
install -m 0755 "$runtime_src/cli.py" /home/hesham/.local/lib/gova-agent/cli.py
ln -sfn /home/hesham/.local/lib/gova-agent/cli.py /home/hesham/.local/bin/gova-agent
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
