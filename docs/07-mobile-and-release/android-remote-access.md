# Android Remote Access and Control

## Purpose

This document is the complete operating reference for the physical OPPO Android device used with Gova. It explains how the device is reached, viewed, controlled, recovered, and kept reachable across Wi-Fi and mobile-data network changes.

The installed stack is:

- **Tailscale** for a stable private network identity across Wi-Fi/network changes.
- **RustDesk** for interactive remote screen/control over the Internet.
- **ADB** for developer commands, inspection, file transfer, screenshots, and input injection.
- **scrcpy** for low-latency interactive Android control from the Linux workstation.
- **Remote Desktop Commander** as the authorized path by which a remote ChatGPT/agent can operate the Linux workstation and then the phone.

This is local developer infrastructure. It does not alter Gova application code, the Android APK/AAB, Static `out/`, Web, Development, or iOS runtime behavior.

## Physical Device

The configured device is an OPPO phone with Android 14. ADB reports model identifier `CPH2773`. The display was observed at `720x1604` during setup.

Do not use the local router address as the durable identity of the phone. The router address can change. Tailscale identity is the durable control path.
## Control Topology

```text
Remote ChatGPT/agent
    -> Remote Desktop Commander
        -> Linux workstation
            -> Tailscale private network
                -> Android phone
                    -> ADB :5555
                    -> RustDesk

Linux workstation
    -> oppo-remote
        -> oppo-adb-connect
            -> oppo-tail-ip
                -> Tailscale peer discovery
                    -> adb connect <private-ip>:5555
        -> scrcpy
```

No router port-forwarding or public ADB tunnel is part of this design.

## Fastest Way to Control the Phone from Linux

Run:

```bash
oppo-remote
```
`oppo-remote` is the preferred local command because it does not depend on the phone's current Wi-Fi address. It discovers the phone through Tailscale, reconnects ADB, and launches scrcpy with `--stay-awake`.

The helper is installed at:

```text
/home/hesham/.local/bin/oppo-remote
```

A second convenience command is:

```bash
oppo-screen
```

`oppo-screen` connects using the phone's current Tailscale MagicDNS identity and launches scrcpy. Prefer `oppo-remote` when possible because its discovery path resolves the current Tailscale IP dynamically.

## Linux Helper Commands

The following local helpers were created:

| Command | Purpose |
|---|---|
| `oppo-tail-ip` | Finds the OPPO peer in `tailscale status --json` and returns its current Tailscale IP. |
| `oppo-adb-connect` | Connects ADB to the discovered Tailscale IP on TCP `5555`, restores reverse mappings for ports `3001..3011`, and returns the resulting ADB serial. If TCP `5555` was lost and USB is attached, it restores TCP mode automatically. |
| `oppo-remote` | Runs `oppo-adb-connect`, then starts scrcpy against that exact serial. |
| `oppo-screen` | Starts scrcpy through the configured MagicDNS endpoint. |
| `oppo-adb-keepalive` | Re-runs the resilient ADB connection helper every 15 seconds so transient network loss and reverse-map loss recover automatically. |
| `oppo-dev-url` | Prints the Desktop MagicDNS development URL on port `3001`; this is the ADB-independent fallback for a phone using mobile data. |
All six helpers live under:

```text
/home/hesham/.local/bin/
```

The installed ADB binary is:

```text
/usr/lib/android-sdk/platform-tools/adb
```

The installed scrcpy binary is:

```text
/home/hesham/.local/bin/scrcpy
```

scrcpy version `4.1` was verified during setup.

## Direct ADB Control

To obtain the current authorized ADB serial without hardcoding any address:

```bash
SERIAL="$(oppo-adb-connect)"
adb -s "$SERIAL" get-state
```

Expected state is `device`. An `offline` state is not considered usable.
Useful developer operations include:

```bash
adb -s "$SERIAL" shell getprop ro.product.model
adb -s "$SERIAL" shell wm size
adb -s "$SERIAL" shell dumpsys window
adb -s "$SERIAL" shell input tap <x> <y>
adb -s "$SERIAL" shell input swipe <x1> <y1> <x2> <y2> <duration-ms>
adb -s "$SERIAL" shell input text '<text>'
adb -s "$SERIAL" exec-out screencap -p > /tmp/oppo-screen.png
adb -s "$SERIAL" push <local-file> /sdcard/Download/
adb -s "$SERIAL" pull /sdcard/Download/<file> <local-destination>
```

Use ADB input only for authorized device automation. Android system permission dialogs and credential fields may still require explicit user interaction.

## scrcpy Control

For interactive screen viewing and touch/keyboard control through the authorized ADB transport:

```bash
oppo-remote
```

Equivalent explicit form:

```bash
SERIAL="$(oppo-adb-connect)"
scrcpy --serial "$SERIAL" --stay-awake
```

scrcpy uses the existing ADB authorization; it does not create a separate remote-access account or bypass Android authorization.
## RustDesk Remote Control

RustDesk `1.4.9` is installed on the phone as Android package:

```text
com.carriez.flutter_hbb
```

RustDesk is the preferred path when controlling the phone from a different computer or network and when ADB is not the primary interface.

To connect from another authorized device:

1. Open the RustDesk client on the controlling device.
2. Sign in to the authorized RustDesk account or select the known Android device from the account/device list.
3. Connect to the OPPO device.
4. Authenticate with the permanent RustDesk password.
5. Confirm that screen capture and RustDesk Input accessibility are active if interactive control is required.

The RustDesk device ID and password are intentionally not hardcoded in project documentation. The Android app/account is the source for the device identity.

A permanent RustDesk password has been configured. The project-local secret key is:

```text
GOVA_ANDROID_RUSTDESK_PASSWORD
```

The key currently exists with a value in `/home/hesham/gova/.env.local`. Never print or commit that value.
### RustDesk permissions and persistence

During setup, Android/OPPO presented a security warning before RustDesk was opened. Setup continued only after explicit user approval.

The following RustDesk capabilities/settings were configured:

- Screen capture enabled.
- File transfer enabled.
- Clipboard sharing enabled.
- Audio capture enabled.
- Microphone permission allowed while the app is in use.
- All-files access allowed for file-transfer use.
- Display-over-other-apps permission allowed.
- Floating-window support enabled.
- Battery restrictions relaxed.
- OPPO permission to run continuously in the background allowed.
- RustDesk `Start on system boot` enabled.
- Permanent password configured.
- RustDesk account sign-in completed through Google OAuth.

The RustDesk main Android service was observed running during verification.

### RustDesk Input accessibility caveat

RustDesk Input accessibility was enabled earlier during setup, but a later Android state query did not show it in the current enabled-services set. Therefore unattended touch/input control must be rechecked before it is relied upon.

If RustDesk displays the screen but cannot tap/type, open Android Accessibility settings and verify that **RustDesk Input** is enabled. This is the first troubleshooting step for RustDesk input failure.
## Tailscale Networking

Tailscale is installed as:

```text
com.tailscale.ipn
```

It is authenticated and connected on the Android phone. The phone receives a private tailnet identity that remains usable when its local Wi-Fi address changes.

Android was configured with:

- Tailscale **Always-on VPN** enabled.
- **Block connections without VPN** left disabled.
- Battery/background restrictions relaxed for Tailscale.

The Linux helper `oppo-tail-ip` discovers the OPPO device from `tailscale status --json`, so normal control does not need a hardcoded Tailscale IP.

The private Tailscale address and MagicDNS name are operational values and are intentionally not duplicated in this document. They can change or expose private-network topology. Local helpers own those details.

Changing router/Wi-Fi IP addresses should therefore not break the normal `oppo-remote` path as long as both Linux and Android remain connected to the same authorized tailnet.

## Development Server Access on Mobile Data

The phone does not need Android Wireless debugging or Wi-Fi merely to open the Gova development server. Two private paths are maintained:

1. **ADB reverse path:** `http://127.0.0.1:3001` on the phone. `oppo-adb-connect` automatically restores reverse mappings for `3001` through `3011`.
2. **Tailscale direct fallback:** run `oppo-dev-url` on the Desktop and open the returned `http://<desktop-magicdns>:3001` URL on the phone. This route is independent of ADB and works over mobile data as long as Tailscale is connected.

The Desktop keeps a tailnet-only Tailscale Serve mapping from port `3001` to `127.0.0.1:3001`. No public listener or router forwarding is required. The direct fallback is therefore the recovery route when ADB is temporarily unavailable.

A healthy phone-side check through ADB is:

```bash
SERIAL="$(oppo-adb-connect)"
adb -s "$SERIAL" shell 'curl -sS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3001/'
```

Expected result: `200`.

## Automatic ADB Reconnection

The enabled user-level recovery unit is:

```text
/home/hesham/.config/systemd/user/oppo-adb-keepalive.service
```

It runs `/home/hesham/.local/bin/oppo-adb-keepalive`, which calls the resilient `oppo-adb-connect` helper every 15 seconds. A successful cycle verifies ADB over the phone's current Tailscale IPv4 address and re-applies all reverse mappings from `3001` through `3011`. If TCP `5555` is unavailable but the phone is attached by authorized USB, the helper automatically runs `adb tcpip 5555` and returns to the Tailscale path.

From a normal logged-in Linux desktop session, inspect it with:

```bash
systemctl --user status oppo-adb-keepalive.service
journalctl --user -u oppo-adb-keepalive.service -n 100 --no-pager
```

The unit is enabled under `default.target`. Enable/restart it when required with:

```bash
systemctl --user enable --now oppo-adb-keepalive.service
systemctl --user restart oppo-adb-keepalive.service
```

A Remote Desktop Commander shell may not inherit the graphical user's systemd bus. `Failed to connect to bus: No medium found` from that shell does not by itself prove that the user service is disabled.

## ADB Authorization State

The Linux workstation was paired through Android **Wireless debugging** and appears in Android's paired-device list.

Android's **Disable ADB authorization timeout** developer option was enabled so this trusted workstation is less likely to require repeated authorization solely because time passed.

The current durable developer transport is ADB TCP `5555` over Tailscale. This is private tailnet access, not a public TCP endpoint.
## Recovery After Phone Reboot or Lost ADB TCP

A full Android reboot can reset the phone's ADB TCP `5555` listener. This is an Android limitation; Tailscale can still be healthy while ADB TCP has been reset.

For a phone that is using **mobile data**, the preferred recovery does not require Wi-Fi or Android Wireless debugging:

1. Unlock the phone and connect it to the Desktop by USB once.
2. Keep normal USB debugging enabled and authorize this Desktop if Android asks.
3. Run:

```bash
oppo-adb-connect
```

The helper detects the authorized USB transport, runs `adb tcpip 5555`, discovers the phone through Tailscale, reconnects `ADB <tailscale-ip>:5555`, and restores reverse ports `3001..3011`. The enabled keepalive service then maintains that state after the cable is removed.

If the cable is unavailable after a reboot, development-server access still works through the ADB-independent Tailscale route:

```bash
oppo-dev-url
```

Open the returned URL on the phone. This keeps development usable over mobile data even before ADB TCP has been restored.

Wireless debugging remains an optional alternative only when Android allows it on the current Wi-Fi network. Do not depend on it for the mobile-data workflow. If the Linux ADB key itself is no longer authorized, Android's normal authorization/pairing prompt must be completed; never bypass or brute-force that security boundary.

## Control Through Remote Desktop Commander

When a remote ChatGPT/agent controls this phone, the authorized execution chain is:

```text
Remote Desktop Commander -> Linux -> ADB/Tailscale -> Android
```

For non-visual automation, the agent can obtain the current serial with `oppo-adb-connect`, issue ADB shell/input commands, capture a screenshot to Linux, inspect it through Remote Desktop Commander, and then issue the next authorized input command.

For a human at the Linux desktop, `oppo-remote`/scrcpy is the normal interactive view.

For access from another independent computer, RustDesk is the preferred screen-control path. Tailscale can also be installed on that authorized computer when private network access is required.

Remote Desktop Commander is not installed on the phone and does not directly speak to Android. It controls the authorized Linux workstation, which owns the Android tools and ADB key.
## Where Each Part Lives

| Item | Location / source |
|---|---|
| This operating guide | `docs/07-mobile-and-release/android-remote-access.md` |
| Project-local RustDesk password key | `/home/hesham/gova/.env.local` -> `GOVA_ANDROID_RUSTDESK_PASSWORD` |
| ADB reconnect systemd unit | `/home/hesham/.config/systemd/user/oppo-adb-keepalive.service` |
| Dynamic Tailscale discovery | `/home/hesham/.local/bin/oppo-tail-ip` |
| ADB connection helper | `/home/hesham/.local/bin/oppo-adb-connect` |
| Primary screen-control helper | `/home/hesham/.local/bin/oppo-remote` |
| Alternate screen helper | `/home/hesham/.local/bin/oppo-screen` |
| ADB keepalive loop | `/home/hesham/.local/bin/oppo-adb-keepalive` |
| Mobile-data development URL helper | `/home/hesham/.local/bin/oppo-dev-url` |
| ADB executable | `/usr/lib/android-sdk/platform-tools/adb` |
| scrcpy executable | `/home/hesham/.local/bin/scrcpy` |
| Tailscale Android package | `com.tailscale.ipn` |
| RustDesk Android package | `com.carriez.flutter_hbb` |
| RustDesk device identity | RustDesk Android app/account device list; intentionally not duplicated here |
| Tailscale private identity | Resolved dynamically by `oppo-tail-ip`; private address intentionally not duplicated here |

`.env.local` is Git-ignored and was verified with filesystem mode `600`. Secret values must stay there or in another approved secret store; they must never be copied into this document.

## Security Invariants

- Never expose ADB `5555` through router port-forwarding or a public tunnel.
- Never commit ADB pairing codes, RustDesk passwords, Tailscale private addresses, account tokens, or private keys.
- RustDesk and ADB are authorized-device tools, not security-bypass mechanisms.
- Do not disable Android security protections beyond the explicit developer/remote-control permissions documented here.
- Root access is not part of this setup and is not required for the documented control paths.
- Keep Tailscale access limited to the authorized tailnet.
- Treat Android system permission prompts as user-security boundaries; do not automate around prompts that explicitly require user consent.

## Failure Modes

- **Wi-Fi IP changed:** use `oppo-remote`; dynamic Tailscale discovery should hide the change.
- **ADB shows `offline`:** disconnect the stale serial, reconnect with `oppo-adb-connect`, and verify `device` state.
- **ADB `5555` disappeared after reboot:** connect authorized USB once and run `oppo-adb-connect`; it restores TCP `5555` and reverse ports automatically. Until then, use `oppo-dev-url` for development-server access over Tailscale/mobile data.
- **Tailscale not reachable:** verify the Android VPN is connected and the Linux workstation is on the authorized tailnet.
- **RustDesk shows video but cannot control:** verify RustDesk Input in Android Accessibility.
- **RustDesk service stopped:** open RustDesk and start screen sharing; Android may require renewed screen-capture consent.
- **OPPO kills background access:** recheck battery/background permissions for Tailscale and RustDesk.
- **systemd status fails only inside Remote Desktop Commander:** verify from the actual logged-in desktop session because the remote shell may not have the user's systemd bus.
- **New Linux workstation:** it must have its own authorized ADB pairing; do not copy an ADB private key casually between machines.

## Current Verification Snapshot

At the most recent verification:

- ADB showed the OPPO phone in `device` state on TCP `5555` over the Tailscale path.
- Mobile-data-only verification succeeded with Android Wi-Fi disabled, mobile data enabled, and Tailscale carrying the ADB path.
- A forced ADB network disconnect recovered automatically through the enabled keepalive loop, including all reverse mappings for `3001..3011`.
- A phone-side request to `http://127.0.0.1:3001` returned HTTP `200` after recovery.
- The tailnet-only Desktop port `3001` fallback returned HTTP `200` independently of ADB.
- Tailscale and RustDesk packages were installed.
- RustDesk main service was present in Android service state.
- RustDesk display-over-other-apps permission was allowed.
- Tailscale and RustDesk were exempted from aggressive battery suspension.
- The RustDesk permanent-password environment key existed and was populated without exposing its value.
- scrcpy reported version `4.1`.
- RustDesk Input Accessibility still required explicit re-verification.
## Runtime Surfaces

This setup is local developer/device infrastructure only:

- **Development:** may use the physical phone for development verification; application code is unchanged.
- **Web:** unaffected.
- **Static `out/`:** unaffected.
- **Android application source:** unaffected; only the external physical test device and developer settings are configured.
- **iOS application source:** unaffected.

## Verification

Safe operational checks are:

```bash
oppo-tail-ip
oppo-adb-connect
adb devices -l
scrcpy --version
```

Project documentation verification after changing this document is:

```bash
npm run docs:generate
npm run docs:ci
npm run architecture:check
```

Do not run `npm run build:static` for this documentation-only change.

## Related Documents

- [Mobile and Release Domain](./README.md)
- [Project Runtime Contract](../09-agent-knowledge/runtime-contract.md)
- [Local macOS iOS Build Machine](./local-macos-ios-build-machine.md)
- [Release and Secrets](./release-and-secrets.md)
