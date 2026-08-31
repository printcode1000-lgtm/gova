#!/usr/bin/env bash
set -euo pipefail

base_script="$(mktemp)"
git show origin/agent-request/chatgpt:.agent-control/payloads/p2p-phase2-package-seal-fix.sh > "$base_script"
sed -i '/^npm run test:local-agent-core$/,$d' "$base_script"
bash "$base_script"
rm -f "$base_script"

npm run test:local-agent-core
npm run typecheck
npm run architecture:docs
npm run docs:generate
npm run architecture:check
npm run docs:ci
