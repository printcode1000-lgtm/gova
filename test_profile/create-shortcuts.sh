#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
DESTINATION="${1:-$SCRIPT_DIR}"
mkdir -p "$DESTINATION"

create_desktop() {
  local name="$1"
  local command="$2"
  local target="$DESTINATION/$name.desktop"
  cat >"$target" <<EOF
[Desktop Entry]
Type=Application
Name=$name
Exec=$command
Terminal=false
Categories=Development;
EOF
  chmod +x "$target"
  echo "[OK] $target"
}

create_desktop "Gova Cloudflare Accounts" "$SCRIPT_DIR/open-cloudflare.sh"
for script in "$SCRIPT_DIR"/*@*.sh; do
  [[ -e "$script" ]] || continue
  create_desktop "$(basename "$script" .sh)" "$script"
done
