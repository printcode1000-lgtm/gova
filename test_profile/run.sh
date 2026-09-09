#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

"$SCRIPT_DIR/create-shortcuts.sh" "$SCRIPT_DIR"
exec "$SCRIPT_DIR/open-cloudflare.sh"
