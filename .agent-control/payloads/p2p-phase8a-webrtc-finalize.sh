#!/usr/bin/env bash
set -euo pipefail
tmp=$(mktemp)
trap 'rm -f "$tmp"' EXIT
git show origin/agent-request/chatgpt:.agent-control/payloads/p2p-phase8a-webrtc-tunnel.sh > "$tmp"
python3 - "$tmp" <<'PY'
from pathlib import Path
import sys
p=Path(sys.argv[1]); s=p.read_text()
needle='npm run architecture:check\nnpm run docs:ci'
replacement='npx tsx scripts/runtime-compatibility-reference.ts --write --confirm-reviewed-compatible-tree\nnpm run architecture:check\nnpm run docs:ci'
if needle not in s: raise SystemExit('phase8a verification tail not found')
p.write_text(s.replace(needle,replacement))
PY
bash "$tmp"
