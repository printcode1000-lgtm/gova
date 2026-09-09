#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
URL="${1:-}"
EMAILS=(
  "hesham10125@gmail.com"
  "heshamgaber692@gmail.com"
  "heshsamhassan779@gmail.com"
)

for email in "${EMAILS[@]}"; do
  "$SCRIPT_DIR/launch-profile.sh" "$email" "$URL"
  sleep 0.4
done
