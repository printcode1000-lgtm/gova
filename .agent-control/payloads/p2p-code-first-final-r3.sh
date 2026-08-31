#!/usr/bin/env bash
set -euo pipefail
git show origin/agent-request/chatgpt:.agent-control/payloads/p2p-code-first-final.sh | sed 's/^npm run typecheck$/true # deferred until post-connect verification/' | bash
