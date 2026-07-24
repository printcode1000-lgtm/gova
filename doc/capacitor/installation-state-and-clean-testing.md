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

## Verification

```bash
npm run test:installation-bootstrap
npm run cap:verify-defaults
npm run typecheck
```

The policy test locks the three decisions: initialize a genuinely empty
installation, safely adopt an older installation, and preserve state across
updates.
