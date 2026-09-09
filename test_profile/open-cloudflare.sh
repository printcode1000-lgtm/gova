#!/usr/bin/env bash
set -euo pipefail

PROFILE_ROOT="${HOME}/.config/google-chrome-test-profiles"
EMAILS=(
  "print.code.1000@gmail.com"
  "bids.stories@gmail.com"
  "hesham.gaber@gmail.com"
  "tenderx.engineer100@gmail.com"
)
URLS=(
  "https://dash.cloudflare.com/8486fdbb1c87dc78481f2def0a23e043/r2/default/buckets/pic1"
  "https://dash.cloudflare.com/166409f3b449d8f1da0dee6d25ed3e08/r2/default/buckets/gova-storage"
  "https://dash.cloudflare.com/f08cd5b705c3c57b1f65a220f7ef2642/r2/default/buckets/productcat1"
  "https://dash.cloudflare.com/21fce63d15897aaa0b68fae1360a1810/r2/default/buckets/ota"
)

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
restore_graphical_env() {
  local pid env_file name value
  if [[ -z "${DISPLAY:-}" && -z "${WAYLAND_DISPLAY:-}" ]]; then
    while IFS= read -r pid; do
      env_file="/proc/$pid/environ"
      [[ -r "$env_file" ]] || continue
      for name in DISPLAY WAYLAND_DISPLAY XDG_RUNTIME_DIR DBUS_SESSION_BUS_ADDRESS XAUTHORITY; do
        value="$(tr '\0' '\n' < "$env_file" 2>/dev/null | sed -n "s/^${name}=//p" | head -n 1)"
        [[ -n "$value" ]] && export "$name=$value"
      done
      [[ -n "${DISPLAY:-}" || -n "${WAYLAND_DISPLAY:-}" ]] && break
    done < <(pgrep -u "$USER" -f '/opt/google/chrome/chrome' 2>/dev/null || true)
  fi

  [[ -n "${XDG_RUNTIME_DIR:-}" ]] || export XDG_RUNTIME_DIR="/run/user/$UID"
  if [[ -z "${DBUS_SESSION_BUS_ADDRESS:-}" && -S "$XDG_RUNTIME_DIR/bus" ]]; then
    export DBUS_SESSION_BUS_ADDRESS="unix:path=$XDG_RUNTIME_DIR/bus"
  fi
  if [[ -z "${DISPLAY:-}" && -z "${WAYLAND_DISPLAY:-}" && -S /tmp/.X11-unix/X0 ]]; then
    export DISPLAY=:0
  fi
  [[ -n "${DISPLAY:-}" || -n "${WAYLAND_DISPLAY:-}" ]]
}

find_profile_for_email() {
  python3 - "$PROFILE_ROOT" "$1" <<'PY'
import json, pathlib, sys
root = pathlib.Path(sys.argv[1])
target = sys.argv[2].strip().lower()
for profile in sorted(root.glob('test_profile_*')):
    pref = profile / 'Default' / 'Preferences'
    if not pref.exists():
        continue
    try:
        data = json.loads(pref.read_text(encoding='utf-8'))
    except Exception:
        continue
    emails = set()
    for item in data.get('account_info') or []:
        value = (item.get('email') or '').strip().lower()
        if value:
            emails.add(value)
    for keys in (('signin', 'username'), ('profile', 'user_name')):
        cur = data
        for key in keys:
            cur = cur.get(key, {}) if isinstance(cur, dict) else {}
        if isinstance(cur, str) and cur.strip():
            emails.add(cur.strip().lower())
    if target in emails:
        print(profile)
        raise SystemExit(0)
raise SystemExit(1)
PY
}
CHROME="$(find_chrome || true)"
if [[ -z "$CHROME" ]]; then
  echo "[ERROR] Google Chrome/Chromium was not found." >&2
  exit 1
fi
restore_graphical_env || {
  echo "[ERROR] No graphical desktop session could be discovered." >&2
  exit 1
}

failures=0
for i in "${!EMAILS[@]}"; do
  email="${EMAILS[$i]}"
  url="${URLS[$i]}"
  if ! profile_dir="$(find_profile_for_email "$email")"; then
    echo "[ERROR] No saved Chrome session found for $email." >&2
    failures=$((failures + 1))
    continue
  fi

  log_file="/tmp/gova-cloudflare-$(basename "$profile_dir").log"
  : > "$log_file"
  nohup "$CHROME" \
    --new-window \
    --no-first-run \
    --no-default-browser-check \
    --user-data-dir="$profile_dir" \
    "$url" >"$log_file" 2>&1 &
  launch_pid=$!
  sleep 1.2
  if pgrep -u "$USER" -f -- "--user-data-dir=$profile_dir" >/dev/null 2>&1; then
    echo "[OPENED] $email -> $(basename "$profile_dir") (launcher pid $launch_pid)"
  else
    echo "[ERROR] $email did not start from $(basename "$profile_dir")." >&2
    sed 's/^/  /' "$log_file" >&2 || true
    failures=$((failures + 1))
  fi
done

exit "$failures"
