# Local macOS iOS Build Machine

## Purpose

Gova uses a local macOS virtual machine as the native iOS/Xcode build environment while Linux remains the canonical development host. This document records the operational contract established for that machine, the bidirectional project synchronization model, local-only configuration keys, toolchain state, conflict handling, and recovery/verification commands.

The goal is to let macOS perform native iOS work on a local project copy without turning the VM into an isolated source tree or allowing silent overwrites between Linux and macOS.

## Scope

This document covers:

- the Linux host and macOS VM topology;
- local-only `.env.local` machine configuration;
- the local macOS Gova checkout;
- Node/npm, Xcode, Ruby/Bundler/Fastlane state;
- sleep/lock prevention for the VM user session;
- bidirectional conflict-safe synchronization;
- `.env.local` synchronization at environment-key granularity;
- backups, conflict reports, and Linux desktop notifications.

It does not authorize deployment, store release, Git pushes, credential rotation, or privileged macOS changes.

## Runtime Topology

| Role | Current location | Responsibility |
|---|---|---|
| Canonical Gova checkout | `/home/hesham/gova` | Primary project tree and final local source authority. |
| macOS Gova checkout | `/Users/hesham/gova-macos` | Native iOS/Xcode working copy synchronized with Linux. |
| macOS VM | QEMU/KVM on the Linux host | Runs Xcode, Apple tooling, and macOS-native build steps. |
| SSH transport | Linux loopback forwarded to guest SSH | Carries synchronization and non-interactive macOS checks. |

The VM consumes Linux host CPU and RAM. It is not a separate physical machine. The configured VM allocation is 8 GiB RAM and 4 vCPUs.

Production iOS still follows the project runtime contract: the Capacitor iOS shell consumes the static `out/` payload plus iOS-native source and signing/build configuration. The VM only provides the macOS-native toolchain required to build that surface.

## Source of Truth

Operational state is intentionally split between repository documentation and local machine files:

- `/home/hesham/gova/.env.local` stores local machine key/value configuration and is Git-ignored.
- `/home/hesham/.local/bin/gova-sync-macos` is the synchronization entry point.
- `/home/hesham/.local/bin/gova-sync-macos.py` owns project-tree synchronization.
- `/home/hesham/.local/bin/gova-sync-env.py` owns `.env.local` synchronization.
- `/home/hesham/.local/bin/gova-sync-notify.py` owns Linux desktop conflict notifications.
- `/home/hesham/.config/systemd/user/gova-macos-sync.service` and `.timer` schedule synchronization.
- `/Users/hesham/Library/LaunchAgents/com.gova.never-sleep.plist` keeps the macOS user session awake.

## Toolchain State

The macOS guest provides the native Apple build environment required for iOS development.
The verified local toolchain state is:

- macOS Sequoia 15.7.9, build 24G830.
- Xcode 26.3, build 17C529, is installed at `/Users/hesham/Applications/Xcode-26.3.0.app`. The application has been opened successfully.
- The system developer selector still points at `/Library/Developer/CommandLineTools`; system-wide Xcode activation and license/first-launch steps remain separate privileged operations.
- Node.js 24.20.0 and npm 11.19.0 are available from the macOS user-local toolchain path and match the repository engine requirements. The Node distribution was checksum-verified before installation.
- Node is installed at `/Users/hesham/.local/opt/node-v24.20.0`; stable `node`, `npm`, `npx`, and `corepack` links live in `/Users/hesham/.local/bin`.
- `/Users/hesham/.zprofile` and `/Users/hesham/.zshrc` prepend the user-local bin directory so fresh zsh login and interactive shells resolve the same toolchain.
- The verified companion versions are npx 11.19.0 and Corepack 0.35.0.
- System Ruby remains 2.6.10.
- A user-local Ruby 3.3.12 exists through rbenv with Psych 5.1.2 and Bundler 2.5.22. A user-local libyaml build is available under `/Users/hesham/.local/libyaml` for the Ruby/Psych toolchain.
- The project Fastlane bundle is available under Ruby 3.3.12 with Fastlane 2.239.0 installed in the macOS-local `vendor/bundle`. `Gemfile.lock` includes the `x86_64-darwin-24` platform so the dependency graph is reproducible on the VM. `vendor/bundle` remains machine-local and is ignored by Git/synchronization.

For Xcode commands that need the full Xcode installation before any system-wide selector change, set `DEVELOPER_DIR` to the installed Xcode application's Developer directory for that command only.

Local Capacitor builds use `scripts/build-static.ts` as the static-build composition root before `cap:sync`; this is required so OTA static-route auditing receives the application category catalog through its declared port.
## Local Machine Configuration Semantics

The ignored local environment file contains a dedicated macOS-VM section. Its fields have these responsibilities:

- **Local user identity:** selects the Linux account that owns the canonical checkout and user services.
- **Local host/guest credentials:** support only explicitly authorized local operations; their values are private and never belong in Git.
- **Apple account identity and credential:** support Apple authentication when required by signing or store tooling; they remain private local data.
- **VM identity:** records the VM name, macOS product, installed version, and build so automation can verify it is acting on the expected guest.
- **SSH connection metadata:** records the loopback host, host-side forwarded port, guest SSH port, guest user, enabled state, and forwarding relationship used by synchronization.
- **Compute topology:** records RAM, vCPU count, core/socket layout, CPU model, and QEMU machine type so the VM can be reproduced consistently.
- **Display and network devices:** record virtual display, network adapter, guest MAC identity, monitor mode, network mode, and framebuffer geometry.
- **KVM metadata:** records the KVM device and the macOS-specific MSR handling setting required by the current QEMU/KVM boot configuration.
- **Storage topology:** records the host mount, backing storage device/filesystem, VM root, main disk, disk format, and configured disk capacity.
- **Boot assets:** record the QEMU boot script, BaseSystem image and format, OpenCore image/configuration, and OVMF firmware files required to boot the guest.
- **Hypervisor metadata:** records QEMU version, VM installation state, recovery attachment state, and the current virtualization/networking mode.
- **Synchronization metadata:** records the macOS project path, normal sync command, verification command, cadence, active bidirectional mode, state directory, baseline location, and conflict-report location.

The exact current key inventory and machine-specific values remain in the ignored `.env.local` file. This separation is deliberate: Git documents the contract, while the local file owns private and machine-specific values.
## Bidirectional Project Synchronization

Synchronization runs automatically every 30 seconds through a user-level systemd timer. It uses the last successful synchronized state to detect which side changed.

For each managed project path, Linux and macOS are compared against that baseline. A change on only one side is copied to the other side. Different changes to the same path are recorded as a conflict and are not replaced automatically.

Deletion follows the same rule. Files being replaced or removed are backed up before mutation. The `.git` directory is not synchronized, so each checkout keeps its own Git metadata.

## Local Environment Key Reference

The ignored `.env.local` file is the authoritative inventory of machine-specific values. The repository documents names and meaning only. Private values remain local.

### Local identity and account keys

| Key | Function | Importance |
|---|---|---|
| `GOVA_LOCAL_LINUX_USER` | Identifies the Linux account that owns the canonical checkout and user-scoped services. | Keeps file ownership and local service paths consistent. |
| `GOVA_LINUX_PASSWORD` | Local Linux credential field. | Used only when an explicitly authorized local operation requires it; never commit or log its value. |
| `GOVA_MACOS_PASSWORD` | Local macOS user credential field. | Supports local guest authentication when explicitly required; never commit or log its value. |
| `MACOS_account_password` | Apple account credential field. | Reserved for Apple authentication flows; never commit or log its value. |
| `MACOS_account_Mail` | Apple account identity field. | Tells Apple tooling which account is intended without making the account identity repository data. |

### VM identity and connection keys

| Key | Function | Importance |
|---|---|---|
| `GOVA_MACOS_VM_NAME` | Human-readable VM name. | Identifies the intended guest in diagnostics. |
| `GOVA_MACOS_VM_PRODUCT` | Installed macOS product family. | Records the expected operating-system family. |
| `GOVA_MACOS_VM_HOST` | Linux-side address used to reach the guest connection endpoint. | Defines where local automation connects. |
| `GOVA_MACOS_VM_SSH_PORT` | Host-side forwarded SSH port. | Allows Linux automation to reach guest SSH through the host. |
| `GOVA_MACOS_VM_GUEST_SSH_PORT` | SSH port inside macOS. | Documents the destination of the host-side forwarding rule. |
| `GOVA_MACOS_VM_SSH_USER` | macOS account used by the local SSH transport. | Ensures sync files are owned by the intended guest user. |
| `GOVA_MACOS_VM_SSH_ENABLED` | Expected SSH availability state. | Lets diagnostics distinguish configured from unavailable guest access. |
| `GOVA_MACOS_VM_HOSTFWD` | Host-to-guest forwarding description. | Records the intended local transport relationship for recovery. |
### VM resource keys

| Key | Function | Importance |
|---|---|---|
| `GOVA_MACOS_VM_RAM_MIB` | Guest memory allocation. | Keeps the VM memory budget explicit. |
| `GOVA_MACOS_VM_VCPUS` | Total virtual CPU count. | Defines CPU capacity available to native builds. |
| `GOVA_MACOS_VM_CPU_CORES` | Configured virtual core count. | Records the intended CPU topology. |
| `GOVA_MACOS_VM_CPU_SOCKETS` | Configured virtual socket count. | Completes the CPU topology definition. |
| `GOVA_MACOS_VM_CPU_MODEL` | CPU model presented to macOS. | Keeps the guest hardware profile reproducible. |
| `GOVA_MACOS_VM_MACHINE` | Virtual chipset/machine model. | Keeps the emulated platform consistent. |
| `GOVA_MACOS_VM_DISPLAY_DEVICE` | Virtual display device. | Records the graphics adapter used by the guest. |
| `GOVA_MACOS_VM_FRAMEBUFFER` | Intended display dimensions. | Records the guest framebuffer geometry. |
### VM device and hypervisor keys

| Key | Function | Importance |
|---|---|---|
| `GOVA_MACOS_VM_NETWORK_DEVICE` | Virtual network adapter model. | Records the adapter macOS expects. |
| `GOVA_MACOS_VM_NETWORK_MAC` | Stable virtual NIC identifier. | Keeps the guest network identity stable across restarts. |
| `GOVA_MACOS_VM_MONITOR` | QEMU monitor mode. | Records how the local VM console is exposed. |
| `GOVA_MACOS_VM_KVM_IGNORE_MSRS` | KVM compatibility flag used by the macOS guest profile. | Records a boot-critical virtualization setting. |
| `GOVA_MACOS_VM_QEMU_BIN` | QEMU executable location. | Identifies the hypervisor binary used to launch the guest. |
| `GOVA_MACOS_VM_QEMU_VERSION` | Verified QEMU version. | Makes host-tool drift visible during troubleshooting. |
| `GOVA_MACOS_VM_KVM_DEVICE` | KVM acceleration device location. | Records the acceleration dependency used by the VM. |
| `GOVA_MACOS_VM_NETWORK_MODE` | QEMU network mode. | Defines how the guest obtains local network access. |
### VM storage and boot keys

| Key | Function | Importance |
|---|---|---|
| `GOVA_MACOS_VM_MOUNT` | Host mount containing VM assets. | Establishes the base storage location for the VM. |
| `GOVA_MACOS_VM_STORAGE_DEVICE` | Host storage device backing the VM mount. | Helps diagnose missing or incorrectly mounted storage. |
| `GOVA_MACOS_VM_STORAGE_FS` | Filesystem type of the host VM storage. | Records host filesystem expectations. |
| `GOVA_MACOS_VM_ROOT` | Root directory of the local OSX-KVM tree. | Base path for boot and disk assets. |
| `GOVA_MACOS_VM_BOOT_SCRIPT` | Local VM launch script. | Canonical entry point for starting the configured guest. |
| `GOVA_MACOS_VM_DISK` | Primary macOS virtual disk image. | Contains the installed guest and persistent guest data. |
| `GOVA_MACOS_VM_DISK_FORMAT` | Primary disk image format. | Ensures tooling opens the disk with the correct format. |
| `GOVA_MACOS_VM_DISK_SIZE` | Configured virtual disk capacity. | Records the expected guest storage ceiling. |
| `GOVA_MACOS_VM_BASE_SYSTEM` | macOS BaseSystem/recovery image path. | Required for recovery or installation workflows. |
| `GOVA_MACOS_VM_BASE_SYSTEM_FORMAT` | BaseSystem image format. | Ensures the recovery image is attached correctly. |
| `GOVA_MACOS_VM_OPENCORE_IMAGE` | OpenCore boot image path. | Provides the guest bootloader layer. |
| `GOVA_MACOS_VM_OPENCORE_CONFIG` | OpenCore configuration path. | Records the bootloader configuration paired with the VM. |
| `GOVA_MACOS_VM_OVMF_CODE` | OVMF firmware code image. | Provides UEFI firmware code to the guest. |
| `GOVA_MACOS_VM_OVMF_VARS` | OVMF variable-store image. | Preserves guest UEFI variable state. |
### VM runtime/status keys

| Key | Function | Importance |
|---|---|---|
| `GOVA_MACOS_VM_INSTALLED` | Records whether the guest installation is considered complete. | Prevents tooling from confusing installation and normal-runtime states. |
| `GOVA_MACOS_VM_RECOVERY_ATTACHED` | Records whether recovery media is attached. | Makes recovery/boot state explicit during troubleshooting. |
| `GOVA_MACOS_VM_PRODUCT_VERSION` | Installed macOS version. | Detects OS-version drift that can affect Xcode and native tooling. |
| `GOVA_MACOS_VM_BUILD_VERSION` | Installed macOS build identifier. | Provides a more precise OS fingerprint than the marketing version alone. |

### Project synchronization keys

| Key | Function | Importance |
|---|---|---|
| `GOVA_MACOS_SYNC_SSH_KEY` | Local path to the synchronization transport key. | Lets automated sync authenticate non-interactively without embedding key material in scripts. |
| `GOVA_MACOS_PROJECT_PATH` | macOS checkout path. | Defines the guest-side project root used by synchronization and native tooling. |
| `GOVA_MACOS_SYNC_VERIFY_COMMAND` | Human/operator verification command. | Provides a single supported way to compare synchronized project state. |
| `GOVA_MACOS_SYNC_INTERVAL_SECONDS` | Synchronization cadence. | Controls how quickly one-sided changes propagate. |
| `GOVA_MACOS_SYNC_COMMAND` | Normal synchronization command. | Defines the supported operator/service entry point. |
| `GOVA_MACOS_SYNC_MODE` | Active synchronization policy. | Records that the system is bidirectional and conflict-safe. |
| `GOVA_MACOS_SYNC_STATE_DIR` | Linux-side synchronization state root. | Holds baselines, reports, backups, locks, and notification state. |
| `GOVA_MACOS_SYNC_BASELINE` | Three-way comparison baseline. | Distinguishes one-sided edits from true two-sided conflicts. |
| `GOVA_MACOS_SYNC_CONFLICT_REPORT` | Project conflict report location. | Gives operators and the notifier a stable conflict source. |

## `.env.local` Conflict Policy

The environment synchronizer compares individual keys against the last accepted environment baseline.

- A key changed on only one side propagates to the other side.
- A key added or removed on one side propagates when the other side did not independently change it.
- If the same key changes differently on both sides, it is recorded as an environment conflict and is not selected automatically.
- Conflict output records the key name only. Values are never included in conflict reports or desktop notifications.
- A successful environment synchronization leaves the two `.env.local` files equivalent.
- Previous copies are retained in the synchronization backup area before replacement.

This behavior is intentionally separate from normal project-file synchronization because environment files contain private values and need key-level conflict detection.

## Machine-local Generated State

Ignored generated trees stay local to the operating system that produced them. This includes `node_modules`, Ruby bundle output, Xcode DerivedData, transient caches, and similar reproducible artifacts.

This boundary is important because these directories can contain platform-specific binaries, absolute paths, caches, or generated metadata. Copying them between Linux and macOS can make a healthy source tree fail for reasons unrelated to the source itself.

Project source and project-owned configuration are synchronized. `.git` metadata is not synchronized. The two checkouts therefore keep independent Git internals while their managed working-tree content stays aligned.

Generated machine-local trees such as `vendor/bundle`, `.swiftpm`, Xcode user data, DerivedData, and temporary device-only Xcode projects are excluded from managed-source snapshots. They must never be pulled from macOS into Linux merely to make file counts match. A healthy sync compares only source-controlled or intentionally managed project files.

The only supported local environment source on either operating system is `.env.local`. Legacy `.env` or `fastlane/.env` files must not remain in the project tree. If discovered, first confirm that their key names already exist in `.env.local`, move the legacy files to a private machine-local backup outside the repository, then run `npm run env:verify:single-source`.

## Backups and Conflict Reports

Before the synchronizer deletes or replaces a managed item, it preserves the prior copy in the synchronization backup tree. Linux-side backups live below the Linux synchronization state directory, and macOS-side backups live below the corresponding user-local state directory in the guest.

Project conflicts are recorded in the project conflict report. Environment conflicts are recorded separately in the environment synchronization state. A conflict does not silently choose Linux or macOS; the conflicting item remains unresolved until an operator decides which change should win or combines the changes deliberately.

## macOS Unattended Build Availability

The macOS user session is configured to stay awake for unattended native builds. A user LaunchAgent starts `/usr/bin/caffeinate -dims` at login and keeps display, user-idle, and system sleep-prevention assertions active.

The screen-saver idle interval is disabled at user level, and the user-level post-idle lock prompt is disabled. This prevents idle interruptions during long native build operations. It does not imply automatic login after a guest reboot and it does not replace administrative authorization for privileged changes.

## Linux Desktop Conflict Notifications

Every synchronization cycle checks both conflict sources and surfaces new conflicts through Linux desktop notifications.

- Every new project-path conflict gets its own notification.
- Every new `.env.local` key conflict gets its own notification, showing the key name only.
- An unchanged conflict is not repeated on every synchronization cycle.
- If a conflict is resolved and later reappears, it can notify again.
- Notification delivery is an operator aid; the conflict-report files remain the authoritative diagnostic evidence.

## Operator Commands

```bash
# Show pending directions/conflicts and environment state
gova-sync-macos status

# Verify managed project content on Linux and macOS
gova-sync-macos verify

# Run one synchronization cycle immediately
gova-sync-macos sync

# Inspect recent service output
journalctl --user -u gova-macos-sync.service
```

The automatic timer is `gova-macos-sync.timer` and invokes `gova-macos-sync.service`. A healthy timer remains active and the most recent service result is successful.

If a non-interactive shell cannot reach the user service bus, use the logged-in user's runtime directory and D-Bus address when invoking `systemctl --user`; do not replace the user service with a system-wide service merely to work around a missing shell environment.

## Healthy-State Invariants

- Linux and macOS managed-file snapshots match after a successful cycle.
- No unresolved path conflict is overwritten automatically.
- Environment conflicts never expose values.
- The baseline advances only after post-sync verification succeeds.
- Backup creation precedes destructive replacement/removal.
- The automatic timer remains enabled and active.
- macOS remains reachable through the configured local transport before a synchronization mutation is attempted.
- Git metadata is never mirrored between the two checkouts.

## Failure Modes

| Failure | Expected behavior |
|---|---|
| macOS is unreachable | Synchronization fails closed; no baseline is advanced. |
| Same project path changed differently on both sides | Path conflict is recorded and neither side is chosen automatically. |
| Same environment key changed differently on both sides | Environment-key conflict is recorded without logging either value. |
| Post-sync snapshots differ | Cycle fails and baseline is not advanced. |
| Desktop notification cannot be delivered | Conflict reports remain authoritative; notification failure is separately visible in service output. |
| Xcode command requires the full application but the selector still targets Command Line Tools | Use command-scoped `DEVELOPER_DIR`; privileged global selector changes remain separate. |
| Fastlane bundle is missing or stale | Reinstall with the documented Ruby 3.3.12/Bundler toolchain; keep `vendor/bundle` local and preserve the macOS platform entry in `Gemfile.lock`. |

## Runtime Surfaces

- **Development:** Linux remains the canonical project host; macOS can contribute source changes through the conflict-safe synchronization path.
- **Web:** no production Web runtime behavior changes solely because this local build machine exists.
- **Static `out/`:** the VM does not change static-export semantics; the existing release artifact contract remains authoritative.
- **Android:** Android remains unaffected by Apple-specific tooling, but shared synchronized source changes can still affect Android and must follow the normal runtime contract.
- **iOS:** this VM supplies the required macOS/Xcode environment for Capacitor iOS native builds, signing work, archive generation, and Apple tooling once their separate prerequisites are satisfied.

## Verification

For synchronization or machine-configuration changes, verify at minimum:

1. `gova-sync-macos status` reports no unintended pending actions or conflicts.
2. `gova-sync-macos verify` reports matching managed project content.
3. The systemd timer is active and the latest service result is successful.
4. The macOS checkout is reachable and the expected Node/npm/Xcode tools resolve.
5. Any deliberate conflict test leaves both competing versions intact until resolution.
6. Documentation checks remain green because this operational contract is part of project knowledge.

## Related Documents

- [Mobile and Release Domain](./README.md)
- [Environment Variables](../02-data-and-storage/environment-variables.md)
- [Project Runtime Contract](../09-agent-knowledge/runtime-contract.md)
- [Fastlane Module](./capacitor/fastlane-module.md)
- [Remote Desktop Commander Mode](../06-super-admin-and-operations/remote-desktop-commander-mode.md)

## Conflict Diagnostic Locations

- Project-path conflicts: `/home/hesham/.local/state/gova-macos-sync/conflicts.json`.
- Environment-key conflicts: `/home/hesham/.local/state/gova-macos-sync/env/conflicts.json`.
- Project synchronization report: `/home/hesham/.local/state/gova-macos-sync/last-report.json`.
- Environment synchronization report: `/home/hesham/.local/state/gova-macos-sync/env/last-report.json`.
- Three-way project baseline: `/home/hesham/.local/state/gova-macos-sync/baseline.json`.
- Desktop-notification seen state: `/home/hesham/.local/state/gova-macos-sync/desktop-conflicts-seen.json`.

The reports identify paths or environment-key names, not secret values. `gova-sync-macos status` is the preferred human-readable summary; the JSON files are the durable diagnostic state.
