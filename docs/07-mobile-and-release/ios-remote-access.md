# iPhone Network Access and Wireless Installation

## Purpose

This document is the operating reference for the physical iPhone used with Gova. It records how the Linux Desktop reaches the phone, how trust is bootstrapped once over USB, and how signed iOS artifacts are installed afterward over the private Tailscale network without the EliteBook or a USB cable.

The intended permanent path is:

```text
Xcode/macOS build host
    -> signed .app or .ipa
        -> Linux Desktop
            -> Tailscale
                -> iPhone Remote Pairing
                    -> CoreDevice userspace tunnel
                        -> InstallationProxyService
```

The EliteBook is not part of the permanent installation path.

## Current Verified Stack

- Tailscale provides the private network path and MagicDNS identity `iphone-11`.
- Python 3.13 provides the runtime used by the current Remote Pairing transport.
- `pymobiledevice3` 11.7.0 provides Remote Pairing, CoreDevice tunneling, service discovery, and app installation.
- `iphone-install` is the Desktop entry point for status checks, app inventory, and signed-app installation.
- Developer Mode and trusted network connections must remain enabled on the iPhone.

## One-Time USB Bootstrap

USB is required only to establish Apple trust and create the Remote Pairing record on this Desktop. Unlock the iPhone, accept **Trust This Computer** if iOS asks, create Remote Pairing from the Desktop, then verify the network path before removing the cable.

The pairing record is private machine state. Never print, commit, or document its key material or the device UDID. After bootstrap succeeds, normal status checks and app installation use the network path, not USB.

## Desktop Helpers

The permanent helpers are `/home/hesham/.local/bin/iphone-install` and `/home/hesham/.local/bin/iphone-direct.py`. The wrapper exposes status, app inventory, and installation; the Python helper owns the direct Remote Pairing tunnel.
## Network-Only Contract

The supported network identity is the Tailscale MagicDNS name `iphone-11`. The helper intentionally does not store a private Tailscale IP, so normal router/Wi-Fi address changes do not require editing the command.

The current Remote Pairing endpoint uses TCP port `49152`. `iphone-direct.py` opens `RemotePairingTunnelService` directly against the MagicDNS host and that TCP endpoint, then creates a userspace CoreDevice tunnel.

Important invariant: the normal `iphone-install` path contains no SSH, SCP, EliteBook, `usbmuxd`, or USB fallback. A successful `iphone-install --status` therefore proves that the iPhone developer services were reached through the network path.

The network path is:

```text
Linux Desktop
    -> iphone-11 (Tailscale MagicDNS)
        -> TCP Remote Pairing
            -> userspace CoreDevice tunnel
                -> RemoteServiceDiscoveryService
                    -> iOS developer services
```

No public port-forwarding is required. Do not expose the Remote Pairing endpoint to the public Internet.

## Fast Verification

Run:

```bash
iphone-install --status
```

A healthy result has `wireless`, `direct`, and `connected` set to `true`. The `userApps` count confirms that the installation service was reached, not merely that the phone answered a ping.

For lower-level network diagnostics, verify Tailscale and the Remote Pairing TCP endpoint without printing private addresses:

```bash
tailscale ping -c 1 iphone-11
getent ahostsv4 iphone-11
timeout 4 bash -lc '</dev/tcp/iphone-11/49152'
```

The authoritative application-level check remains `iphone-install --status` because it completes the Remote Pairing handshake, creates the tunnel, opens iOS service discovery, and queries installed user applications.

Tailscale status may report the iPhone peer with a generic `HostName` such as `localhost` while its `DNSName` still identifies `iphone-11`. For diagnostics, prefer the MagicDNS name, peer `DNSName`, TCP reachability, and the full `iphone-install --status` handshake instead of relying on the peer `HostName` field alone.

## App Inventory

To list user-installed applications through the same network-only path:

```bash
iphone-install --apps
```

This is also useful as a stronger diagnostic when `--status` succeeds but installation behavior needs inspection.

## Installing a Signed Xcode Artifact

After Xcode produces a correctly signed artifact, install it from the Linux Desktop with:

```bash
iphone-install /absolute/path/to/App.ipa
```

or:

```bash
iphone-install /absolute/path/to/App.app
```

The artifact must already be signed for the target iPhone. The Linux network installer does not create Apple signatures or provisioning profiles. Signing remains an Xcode/macOS responsibility.

For the Gova pipeline, the intended flow is:

```text
npm run build:static
    -> npm run cap:sync
        -> Xcode/macOS build + signing
            -> signed .app/.ipa copied to Linux Desktop
                -> iphone-install <artifact>
```

See [Local macOS iOS Build Machine](./local-macos-ios-build-machine.md) for the Xcode build host contract.

## Recovery After Network or iPhone Restart

First run:

```bash
iphone-install --status
```

If it fails, check in this order:

1. The iPhone is unlocked at least once after reboot.
2. Tailscale is connected on both the Desktop and iPhone.
3. `tailscale ping -c 1 iphone-11` succeeds.
4. MagicDNS resolves `iphone-11`.
5. Developer Mode remains enabled.
6. Remote Pairing TCP is reachable.
7. The local Remote Pairing record still exists and is readable only by the owning user.

If iOS changes the advertised Remote Pairing port after a major update, reset, or pairing rebuild, do not guess or expose random ports publicly. Re-discover the `_remotepairing._tcp` endpoint while the phone is locally reachable, update the local helper, and re-run `iphone-install --status`.

If the pairing record is rejected, reconnect the iPhone to this same Desktop by USB, unlock it, accept Apple trust if prompted, recreate Remote Pairing, and verify the network path before removing the cable again.

A cable is therefore a recovery/bootstrap tool, not a normal installation dependency.

## Verified Network Evidence

On 2026-09-08 the Desktop verified all of the following:

- Tailscale ping to `iphone-11` succeeded.
- MagicDNS resolution for `iphone-11` succeeded.
- The Remote Pairing TCP endpoint was reachable over the network.
- `iphone-install --status` completed a direct Remote Pairing userspace tunnel and returned `wireless: true`, `direct: true`, and `connected: true`.
- The same network-only session enumerated 66 user applications through `InstallationProxyService`.
- The helper source contained no SSH, SCP, EliteBook, `usbmuxd`, or USB fallback path.

The USB cable happened to be physically attached during part of the verification session, but the tested helper cannot select USB. Its transport is explicitly `RemotePairingTunnelService(UDID, iphone-11, 49152)`, so successful service enumeration is network evidence rather than USB evidence.

## Security Rules

- Never commit Remote Pairing records, private keys, Apple credentials, provisioning secrets, or device UDIDs.
- Never document the phone's private Tailscale IP when MagicDNS is sufficient.
- Keep the pairing-state directory user-private.
- Do not expose Remote Pairing or developer services through router port forwarding.
- Treat installation as authorized developer-device access; it does not bypass iOS code signing, provisioning, Developer Mode, or Apple trust controls.
