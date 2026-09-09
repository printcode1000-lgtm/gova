#!/usr/bin/env bash
set -euo pipefail

EMAIL="${1:?Usage: launch-profile.sh <email> [url]}"
URL="${2:-}"
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

find_chrome() {
  local candidate
  for candidate in google-chrome google-chrome-stable chromium chromium-browser; do
    if command -v "$candidate" >/dev/null 2>&1; then
      command -v "$candidate"
      return 0
    fi
  done
  return 1
}

CHROME="$(find_chrome || true)"
if [[ -z "$CHROME" ]]; then
  echo "[ERROR] Google Chrome/Chromium was not found." >&2
  exit 1
fi

PROFILE_MATCH="$(python3 - "$EMAIL" <<'PY'
import json, pathlib, sys
email = sys.argv[1].strip().lower()
for root in (pathlib.Path.home()/'.config/google-chrome', pathlib.Path.home()/'.config/chromium'):
    state = root/'Local State'
    if not state.exists():
        continue
    try:
        info = json.loads(state.read_text(encoding='utf-8')).get('profile', {}).get('info_cache', {})
    except Exception:
        continue
    for name, meta in info.items():
        value = (meta.get('user_name') or meta.get('email') or '').strip().lower()
        if value == email:
            print(f'{root}\t{name}')
            raise SystemExit(0)
PY
)"

ARGS=(--new-window)
if [[ -n "$PROFILE_MATCH" ]]; then
  IFS=$'\t' read -r USER_DATA_DIR PROFILE_DIR <<<"$PROFILE_MATCH"
  ARGS+=(--user-data-dir="$USER_DATA_DIR" --profile-directory="$PROFILE_DIR")
  echo "[OK] $EMAIL -> $PROFILE_DIR"
else
  SAFE_EMAIL="${EMAIL//[^A-Za-z0-9._-]/_}"
  USER_DATA_DIR="$SCRIPT_DIR/profiles/$SAFE_EMAIL"
  mkdir -p "$USER_DATA_DIR"
  ARGS+=(--user-data-dir="$USER_DATA_DIR")
  echo "[INFO] No existing Chrome profile for $EMAIL; using isolated Linux profile."
fi

if [[ -z "$URL" && -z "$PROFILE_MATCH" ]]; then
  URL="https://accounts.google.com/AddSession?Email=$EMAIL"
fi
if [[ -n "$URL" ]]; then
  ARGS+=("$URL")
fi

if [[ "${GOVA_PROFILE_LAUNCH_DRY_RUN:-0}" == "1" ]]; then
  printf '[DRY-RUN] %q' "$CHROME"
  printf ' %q' "${ARGS[@]}"
  printf '\n'
  exit 0
fi

nohup "$CHROME" "${ARGS[@]}" >/dev/null 2>&1 &
echo "[STARTED] $EMAIL"
