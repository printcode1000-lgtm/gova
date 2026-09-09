#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
URL="https://dash.cloudflare.com/"
EMAILS=(
  "print.code.1000@gmail.com"
  "bids.stories@gmail.com"
  "hesham.gaber@gmail.com"
  "tenderx.engineer100@gmail.com"
)

for email in "${EMAILS[@]}"; do
  "$SCRIPT_DIR/launch-profile.sh" "$email" "$URL"
  sleep 0.4
done
