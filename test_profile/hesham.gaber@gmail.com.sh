#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
exec "$SCRIPT_DIR/launch-profile.sh" "hesham.gaber@gmail.com" "https://dash.cloudflare.com/"
