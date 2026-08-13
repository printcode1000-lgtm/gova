# Installation State and Clean Testing

## Expected behavior

Building web assets does not carry the browser or device's IndexedDB,
preferences, cookies, or authenticated session into `out/`, Android, iOS, or
an OTA release.

ASOL intentionally distinguishes three cases:

| Case                                                      | Behavior                                                                                                |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Genuinely new installation                                | Arabic, RTL, light theme, comfortable density, normal contrast, and no authenticated session            |
| Existing installation created before installation markers | Adopt existing local data without changing it                                                           |
| Native or OTA update                                      | Preserve session, theme, locale, cart, favorites, notifications, page snapshots, and other client state |

This prevents a release from unexpectedly logging out existing users or
discarding their settings.

## Android backup and reinstall

Android Auto Backup and device-to-device transfer are disabled for ASOL.
`AndroidManifest.xml` sets `android:allowBackup="false"` and references both
legacy full-backup rules and Android 12+ data-extraction rules. Every Android
storage domain is excluded, including app files, databases, preferences,
device-protected storage, external app storage, and WebView data containing
AsolDB/IndexedDB.

This distinction is intentional:

- updating an installed application preserves its existing on-device data;
- clearing application data resets it;
- uninstalling and reinstalling starts clean and Android must not restore a
  previous session or theme from Google Backup or device transfer.

`npm run android:backup:validate` verifies the manifest and both rule files.
The validation runs before and after `cap sync` and `cap copy`, and is also part
of `cap:verify-defaults` and the complete test suite.

## Runtime bootstrap

`InstallationBootstrap` runs before session, favorites, preferences,
notifications, OTA, query-cache, and page-snapshot providers. It stores a
versioned `installation-state` record in the AsolDB `appSettings` store.

For an empty AsolDB it writes the central default theme and application
preferences and ensures there is no session. If any older client data exists
without a marker, the bootstrap classifies the installation as legacy and
preserves it. Every later bundle only updates the marker's last-seen version.

Deleting all client data or using the settings reset recreates a genuinely
fresh state on the next launch.

## Build audit

Every `build:static` run invokes the Capacitor defaults audit before it can
complete. Therefore both `ota:publish` and `cap:build` inherit the same guard.
The audit verifies:

- initial HTML is Arabic and RTL;
- initial theme is light;
- the blocking app initializer selects light, comfortable, normal-contrast
  defaults;
- no `.env`, Firebase configuration file, SQLite database, or `sync_data`
  directory entered the static output.
- Android cannot back up or restore client data after reinstall.

Run the audit independently with:

```bash
npm run cap:verify-defaults
```

## Clean device testing

Normal updates preserve data. To inspect the exact first-install experience,
use a dedicated clean-test command instead of changing production update
behavior:

```bash
# Android device or emulator
npm run cap:run:clean:android

# iOS simulator on macOS
npm run cap:run:clean:ios
```

Each command performs a local Capacitor build, clears or uninstalls only
`hgh.asol.app` on the selected test target, then runs the application. It never
publishes OTA or creates a production release.

An explicit target may be passed directly to the script:

```bash
npx tsx scripts/cap-run-clean.ts android --target=DEVICE_ID
npx tsx scripts/cap-run-clean.ts ios --target=SIMULATOR_ID
```

On a physical iOS device, uninstall the test application through the device or
Xcode because `simctl` applies only to simulators.

## The Android testing package

The release console's testing card does the same thing for Android, harder and
without being asked twice. Building and installing are separate commands, so a
rebuild never wipes a phone as a side effect:

```bash
npm run android:build:debug     # builds only; touches no device
npm run android:device:install  # wipes the device and installs what was built
```

The build produces the `debugR8` variant — R8-shrunk like a release, still
`debuggable` and signed with the debug key. The install detects the connected device and removes
**every** package under `hgh.asol.app` for **every** user profile on it, along
with the app-scoped directories under `/sdcard/Android/{data,media,obb}` that
outlive a partial uninstall. Data, settings, databases, WebView storage and
notification channels all live inside the package's own records, so the system
drops them with it.

It then asks the device again and refuses to continue if anything is left. A
wipe that quietly found nothing looks exactly like one that worked, which is
why the check exists and why the log names each package before removing it.

Uninstalling rather than clearing is not fussiness: a package whose signer
differs from the installed one is refused with
`INSTALL_FAILED_UPDATE_INCOMPATIBLE`, and no amount of `pm clear` changes that.
A left-over instrumentation package is the other trap — it runs yesterday's
tests against today's build.

`--device=<serial>` selects a device; with several attached and no serial, the
script refuses rather than guesses. Installing builds nothing: with no package
built yet it stops and says so, instead of starting a long build nobody asked
for.

## Verification

```bash
npm run test:installation-bootstrap
npm run cap:verify-defaults
npm run typecheck
```

The policy test locks the three decisions: initialize a genuinely empty
installation, safely adopt an older installation, and preserve state across
updates.
