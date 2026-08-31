#!/usr/bin/env bash
set -euo pipefail
python3 - <<'PY'
from pathlib import Path
p=Path('scripts/install-local-agent-direct-service.ts')
s=p.read_text()
s=s.replace('import { DIRECT_SYSTEMD_UNIT_NAME, directAgentDir, ensureDirectDir, renderDirectSystemdUnit } from "@asol/local-agent-core/direct";', 'import { DIRECT_SYSTEMD_UNIT_NAME, ensureDirectDir, renderDirectSystemdUnit } from "@asol/local-agent-core/direct";')
s=s.replace('const workspace=path.resolve(process.env.GOVA_LOCAL_WORKSPACE || process.cwd());', 'const workspace=path.resolve(process.env.GOVA_DIRECT_SERVICE_WORKSPACE || process.cwd());')
s=s.replace('const envFile=path.join(ensureDirectDir(directAgentDir()),"service.env");', 'const envFile=path.join(ensureDirectDir(path.join(workspace,".local","direct-agent")),"service.env");')
p.write_text(s)
PY
npm run test:local-agent-core
npm run typecheck
npm run docs:generate
npm run architecture:check
