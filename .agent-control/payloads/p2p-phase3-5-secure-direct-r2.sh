#!/usr/bin/env bash
set -euo pipefail

base="$(mktemp)"
git show origin/agent-request/chatgpt:.agent-control/payloads/p2p-phase3-5-secure-direct.sh > "$base"
sed -i '/^npm run test:local-agent-core$/,$d' "$base"
bash "$base"
rm -f "$base"

python3 - <<'PY'
from pathlib import Path
p=Path('packages/local-agent-core/src/host-discovery.ts')
s=p.read_text()
anchor='''        challenge: input.challenge,\n        challengeExpiresAt: input.challengeExpiresAt,\n      },'''
replacement='''        challenge: input.challenge,\n        challengeExpiresAt: input.challengeExpiresAt,\n        resultKeyPrefix: directAuthResultKeyPrefix(input.hostId),\n      },'''
if anchor not in s: raise SystemExit('bootstrap result prefix anchor missing')
s=s.replace(anchor,replacement)
p.write_text(s)
PY

npm run test:local-agent-core
npm run typecheck
npm run architecture:docs
npm run docs:generate
npm run architecture:check
npm run docs:ci
