#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
exec "$SCRIPT_DIR/launch-profile.sh" "tenderx.engineer100@gmail.com" "https://dash.cloudflare.com/"
