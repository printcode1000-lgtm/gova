#!/usr/bin/env bash
set -euo pipefail
npm install --save-dev @types/dom-mediacapture-transform@0.1.12
git show origin/agent-request/chatgpt:.agent-control/payloads/p2p-code-first-final.sh | bash
