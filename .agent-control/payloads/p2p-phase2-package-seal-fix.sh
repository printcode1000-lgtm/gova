#!/usr/bin/env bash
set -euo pipefail

base_script="$(mktemp)"
git show origin/agent-request/chatgpt:.agent-control/payloads/p2p-phase2-fix-tests.sh > "$base_script"
sed -i '/^npm run test:local-agent-core$/,$d' "$base_script"
bash "$base_script"
rm -f "$base_script"

node <<'NODE'
const fs = require('node:fs');
const p = 'packages/local-agent-core/package.json';
const pkg = JSON.parse(fs.readFileSync(p, 'utf8'));
pkg.exports['./direct'] = { types: './src/direct/index.ts', default: './src/direct/index.ts' };
fs.writeFileSync(p, JSON.stringify(pkg, null, 2) + '\n');
NODE

python3 - <<'PY'
from pathlib import Path
p=Path('scripts/local-agent-device-discovery.ts')
s=p.read_text().replace('from "../packages/local-agent-core/src/direct/index";', 'from "@asol/local-agent-core/direct";')
p.write_text(s)
PY

npm run test:local-agent-core
npm run typecheck
npm run docs:generate
npm run architecture:check
npm run docs:ci
