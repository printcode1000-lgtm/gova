# Android Remote Access and Control

## Purpose

This document is the complete operating reference for the physical OPPO Android device used with Gova. It explains how the device is reached, viewed, controlled, recovered, and kept reachable when its Wi-Fi IP changes.

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
| `oppo-adb-connect` | Connects ADB to the discovered Tailscale IP on TCP `5555` and returns the resulting ADB serial. |
| `oppo-remote` | Runs `oppo-adb-connect`, then starts scrcpy against that exact serial. |
| `oppo-screen` | Starts scrcpy through the configured MagicDNS endpoint. |
| `oppo-adb-keepalive` | Periodically reconnects ADB to the current Tailscale IP. |
All five helpers live under:

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

## Automatic ADB Reconnection

A user-level systemd unit was created at:

```text
/home/hesham/.config/systemd/user/oppo-adb-connect.service
```
The unit runs `/home/hesham/.local/bin/oppo-adb-connect`, restarts automatically, and waits five seconds between restarts. Its purpose is to keep re-establishing the ADB transport after transient network changes.

From a normal logged-in Linux desktop session, inspect it with:

```bash
systemctl --user status oppo-adb-connect.service
journalctl --user -u oppo-adb-connect.service -n 100 --no-pager
```

Enable/restart it when required with:

```bash
systemctl --user enable --now oppo-adb-connect.service
systemctl --user restart oppo-adb-connect.service
```

A Remote Desktop Commander shell may not inherit the graphical user's systemd bus. `Failed to connect to bus: No medium found` from that shell does not by itself prove that the user service is disabled.

## ADB Authorization State

The Linux workstation was paired through Android **Wireless debugging** and appears in Android's paired-device list.

Android's **Disable ADB authorization timeout** developer option was enabled so this trusted workstation is less likely to require repeated authorization solely because time passed.

The current durable developer transport is ADB TCP `5555` over Tailscale. This is private tailnet access, not a public TCP endpoint.
## Recovery After Phone Reboot or Lost ADB TCP

A full Android reboot can reset the ADB TCP `5555` state even when Tailscale and RustDesk start again correctly.

Recovery sequence:

1. Unlock the phone.
2. Open **Developer options -> Wireless debugging** and enable it.
3. Read the **IP address & Port** shown on the main Wireless debugging page. This is the connection endpoint.
4. From Linux, connect to that endpoint:

```bash
adb connect <phone-lan-ip>:<wireless-debugging-connect-port>
```

5. Verify that `adb devices -l` shows the endpoint as `device`.
6. Switch the authorized ADB daemon back to TCP `5555`:

```bash
adb -s <phone-lan-ip>:<wireless-debugging-connect-port> tcpip 5555
```

7. Return to the normal Tailscale path:

```bash
oppo-adb-connect
oppo-remote
```

Do not confuse the main Wireless debugging connection port with the temporary pairing port.
If the Linux ADB key is no longer paired, use **Pair device with pairing code** on Android. That dialog shows a separate temporary pairing endpoint and code.

Pair first:

```bash
adb pair <phone-lan-ip>:<pairing-port>
```

Enter the current pairing code when prompted. Then use the **main Wireless debugging** page's connection port with `adb connect`. The pairing port and connection port are different and can both change.

Never brute-force a pairing code or bypass Android authorization.

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
| ADB reconnect systemd unit | `/home/hesham/.config/systemd/user/oppo-adb-connect.service` |
| Dynamic Tailscale discovery | `/home/hesham/.local/bin/oppo-tail-ip` |
| ADB connection helper | `/home/hesham/.local/bin/oppo-adb-connect` |
| Primary screen-control helper | `/home/hesham/.local/bin/oppo-remote` |
| Alternate screen helper | `/home/hesham/.local/bin/oppo-screen` |
| ADB keepalive loop | `/home/hesham/.local/bin/oppo-adb-keepalive` |
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
- **ADB `5555` disappeared after reboot:** restore Wireless debugging access, run `adb tcpip 5555`, then return to `oppo-adb-connect`.
- **Tailscale not reachable:** verify the Android VPN is connected and the Linux workstation is on the authorized tailnet.
- **RustDesk shows video but cannot control:** verify RustDesk Input in Android Accessibility.
- **RustDesk service stopped:** open RustDesk and start screen sharing; Android may require renewed screen-capture consent.
- **OPPO kills background access:** recheck battery/background permissions for Tailscale and RustDesk.
- **systemd status fails only inside Remote Desktop Commander:** verify from the actual logged-in desktop session because the remote shell may not have the user's systemd bus.
- **New Linux workstation:** it must have its own authorized ADB pairing; do not copy an ADB private key casually between machines.

## Current Verification Snapshot

At the most recent verification:

- ADB showed the OPPO phone in `device` state over the Tailscale path.
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
