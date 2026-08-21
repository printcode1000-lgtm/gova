# Release Command Center

The release command center UI lives in `src/modules/google-play-console`. Its browser-safe command
policy is sealed behind `@asol/release-core/console`, process mechanics are behind
`@asol/release-core/console-server`, and artifact analysis is isolated in
`@asol/release-core/console-artifacts`. `src/modules/release-commands` now contains only the client
API/hook and the single server wiring seam.

Google Play Store asset contracts and image validation are sealed separately in
`@asol/google-play-store-assets-core`, so release-command tests exercise the same PNG/JPEG validation
rules used by the Store Assets tab without importing the app module.

## Catalog

`packages/release-core/src/console/build-command-catalog.ts` is the single source of truth for every command. Each
entry declares:

- command id
- npm script
- argv
- category: `web-static`, `ota`, `native-android`, `verification`, `fastlane`
- danger: `safe`, `destructive`, `publishes-live`
- confirmation phrase for live publishing
- required env vars
- expected artifact paths
- estimated duration

## Job Runner

`@asol/release-core/console-server` runs commands through async `spawn`, never
`spawnSync`. stdout and stderr are written to:

`.backups/build-jobs/<jobId>.log`

Metadata is written to:

`.backups/build-jobs/<jobId>.json`

The runner keeps process orchestration and state transitions. Build-job
directory paths, record/log file naming, retry constants, and retention limits
live in `packages/release-core/src/console-server/build-job-files.ts`.

## Single Flight

One lock covers the `native-android`, `ota` and `fastlane` categories. No two jobs from
those categories can run at the same time.

## Cancellation

Cancelling kills the process tree — on Windows through `taskkill /T /F` — and updates the
metadata to `cancelled`.

## Artifacts

When a job finishes, these paths are inspected:

- `android/app/build/outputs/bundle/{release,releaseNoR8}/*.aab`
- `android/app/build/outputs/apk/{release,releaseNoR8}/*.apk`
- `android/app/build/outputs/mapping/release/*.txt`
- `out/asol-web-manifest.json`

Each artifact shows its name, size, mtime and SHA-256, and can be downloaded from a
protected route available in development only.

Server access to artifact paths and dev-tool keys is dynamic on purpose, so its
`path.resolve` and `existsSync` sites carry `turbopackIgnore`. That marker stops Next from
tracing the whole workspace into the server bundle; it does not disable the allowed-root
check or the runtime development guard.

## Confirmation Model

Any command whose danger is `publishes-live` requires the catalog's confirmation phrase.
The server verifies it before spawning and does not trust the client.

The `release-android` button is the only full-release path, and it does not start until a
shell version is chosen in the confirmation dialog:

- the current Android version, the current content version, and the live OTA version, with
  the suggested next patch;
- rebuild the shell at the current Android version, or raise `versionName` and
  `versionCode` to a new patch;
- the new content line the release will open appears before confirming, derived from the
  chosen shell version.

This path **publishes nothing**. The package it builds carries its own complete, current
content, so whoever installs it already holds every update and publishing an OTA at the
same moment would mean nothing. That is why it asks for no OTA credentials and no
confirmation phrase, and neither reads nor writes R2. Publishing an OTA on top of the new
release is a separate, later act through the `ota-publish` button, and the resume option
belongs to that button alone.

R2 operations — on the paths that reach it — automatically retry transient network and DNS
errors, including `ENOTFOUND` and `EAI_AGAIN`, before treating a job as failed.

`scripts/release-android.ts` is the release orchestrator. It passes the shell choice to
`cap-build.ts` with `--no-ota` first, and starts `build-android-signed.ts` only after the
web build, the content line and the Capacitor sync succeed. Do not use a compound npm
chain for this path: the launcher's parameters would attach to the last command instead of
to the release planner.

After `cap-build.ts` succeeds, the orchestrator passes `ASOL_WEB_BUNDLE_READY=1` to the
signed Android build. The flag is never set earlier, because it is the proof that the
release planner built the bundle, stamped it with the versions it ships with, and synced it
into the native project. On the publishing path (`cap:build` without `--no-ota`) it
additionally means the bundle matched the published manifest and its content was verified
on R2.

### The command and the button are one thing

`npm run release:android` and the "start full release" button are not parallel paths. The
button collects the choice, `build-command-catalog` turns it into `--native-version=`, and
`build-job-runner` then spawns **the same command**:

```js
spawn(npmCli, ["run", "release:android", "--", ...argv])
```

Because the command was also launched from `.vscode/launch.json` with no arguments,
`cap-build` fell through to `auto` — a third behaviour the dialog never offers and nobody
asked for. Now:

- if `--native-version=` is passed, it is used as given;
- otherwise, with an interactive terminal, **the dialog's own question** is asked with the
  same two answers;
- otherwise — which is the button's case, since `build-job-runner` spawns with
  `stdio: "pipe"` to write the job log — the run is **refused**, and nothing is assumed.

Prompting is conditional on a terminal for a practical reason: without one, a question is
not a question but a hang, the question itself is buried in a log file, and the exclusive
release lock stays held until the job is killed by hand.

**All terminal output is English only.** Mixed-script lines reorder themselves around
option numbers and flag values in most shells, misleading about which key selects what. The
wording is the English side of the same `releaseConsole.parameterValues.*` keys the dialog
renders, so the two surfaces cannot drift apart while describing one choice.

### What each choice does

| Choice | Argument | Effect |
| :-- | :-- | :-- |
| Rebuild with the current Android version | `--native-version=current` | Rebuilds at **Google Play Production** `versionName` with fresh `out/` inside. Refuses when compiled native changes exist. Nothing is uploaded to R2 |
| Create a new Android patch version | `--native-version=next-patch` | Target is **Production + 1 patch** (stable across repeated builds until Play publishes it). Local `build.gradle` numbers are corrected to match. Nothing is uploaded to R2 |

An example of the first: Google Play is published at `0.2.3`, R2 carries OTA `0.2.3.1`, and
the fresh local package carries `0.2.3.0` with the newest content for hands-on testing.
Publishing a higher OTA such as `0.2.3.2` is a separate, later act.

`<native>.0` is the shell's own version. It is **never published to R2 and uploads no
files** — it only declares the start of a new line. Whoever installs `0.2.5` from Google
Play already holds the newest content, and needs an OTA only for later updates on that
line, such as `0.2.5.1`.

### "Keep the current version" is refused when native changed

If the build contains compiled native changes, `cap-build` refuses that choice outright and
requires a new patch version. A native change means a different shell, and keeping the
version would give two different binaries one identity: Google Play rejects the duplicate
`versionCode`, and no device could tell them apart.

This guard used to be conditional on the target not outranking the baseline, so a shell
already ahead of the last store tag — the normal state between releases — kept its version
while carrying new native code. The condition is now
`hasCompiledChanges && action === "current"`, with no exception.

Web-only changes are unaffected: a fresh `out/` bundle at the published version numbers is
exactly what that choice is for.

### Content-line ordering on the release path

The release path uses `assertContentLineDoesNotRegress`, not
`assertContentVersionAdvances`. The second rule belongs to publishing, where a version that
does not advance reads as "no update" and reaches nobody. Here nothing is published, and
the shell stamps `<native>.0`, which is **always the lowest value on its line** — every OTA
above it is `.1` and upward. So a counter comparison rejected the normal case:

```text
published OTA        0.2.3.1
shell being rebuilt  0.2.3.0   ← lower counter, same line, not a regression
```

What is refused is a regression of the **line**: dropping the shell from `0.2.5` to `0.2.4`
would ship older native content as if it were current.

When the local `out/` manifest sits on a **phantom** line ahead of the Play-derived target
(for example local `0.2.6.0` while Production is `0.2.2` and the next shell is `0.2.3.0`),
`cap-build` ignores that local baseline instead of blocking the store rebuild. Phantom
accumulation must never override Google Play Production truth.

### Every package is signed and R8-processed

`build-android-signed.ts` runs `:app:bundleRelease` and `:app:assembleRelease`, and the
`release` build type in [android/app/build.gradle](../../../android/app/build.gradle) keeps
`minifyEnabled true`, `shrinkResources true` and `signingConfig signingConfigs.release`.
The script refuses when any of the four keystore variables is missing rather than emitting
an unsigned artifact.

And `release:android` **refuses `--no-r8`**. `cap-build` permits that flag alongside
`--no-ota` — which is exactly what this path passes — so `release:android --no-r8` would
have assembled unminified `releaseNoR8` artifacts and **then** signed a separate `release`
build on top: two different outputs from one release run. For an unminified diagnostic
build use `cap-build` directly with `--skip-ota --no-r8`; its output ships nowhere.

This path **never contacts Google Play** — no fastlane, no `androidpublisher`. It produces
`app-release.aab` and `app-release.apk` locally, and publishing to the store is a separate
manual decision after hands-on testing is finished.

### Three breaks this path had never exercised

The release failed four times in a row before producing anything, and none of the three
causes was a regression: each was a defect that had existed since the change that
introduced it, in a path no repository gate opened. They are recorded because the shape
repeats.

**1. `npx cap sync` erased 25 plugin registrations.** Capacitor discovers plugins by
reading the **root** `package.json` dependencies, and every Capacitor plugin is declared by
`@asol/native-core` instead — rule 9: upgrading Capacitor must touch one module. So sync
found zero plugins, regenerated `android/capacitor.settings.gradle` with none of them, and
the native compile failed with "package com.capacitorjs.plugins.pushnotifications does not
exist". The fix is `includePlugins` in [capacitor.config.ts](../../../capacitor.config.ts),
Capacitor's own override for discovery, derived from native-core's dependencies so there is
still one source of truth and adding a plugin needs no second edit.

**2. The `:native-core` Gradle module had never compiled.** It was added on 2026-08-15,
after the last successful Android build, so no build had opened it. Two defects:

- Its Java extends `PushNotificationsPlugin`, but `build.gradle` did not depend on
  `:capacitor-push-notifications`.
- The module namespace is `hgh.asol.app.nativecore` while its sources sit in package
  `hgh.asol.app`, so unqualified `R` resolved to a nonexistent `hgh.asol.app.R`. The three
  files now import `hgh.asol.app.nativecore.R` explicitly.
- `AsolPushMessagingService` named `MainActivity` directly. That activity lives in the
  **application** module, and a library cannot depend on the app that consumes it. The tap
  intent is now resolved with `getLaunchIntentForPackage`, which is what a tap should open
  anyway and leaves the module independent of the app's entry-point name.

**3. The iOS push-policy validator pointed at moved files.** Extracting notifications into
`@asol/notifications-core` left `packages/native-core/scripts/validate-ios-push-policy.ts`
reading four paths under `src/features/notifications/`. It was also wired into no gate, so
nothing reported it; `ios:push:validate` now runs inside `test`, `build` and `build:static`.

The common thread: **a gate that never opens a directory reports green about it.** The
Capacitor sync, the Gradle module and the iOS validator were each verified by their own
existence, not by being run.

## Testing On A Real Device

The testing card is a path of its own, separate from the release path. It builds `debugR8`
— minified by R8 like the release, but still `debuggable` and signed with the debug key —
so testing runs against the same optimized code that ships, not an unminified variant no
user ever sees. `testBuildType "debugR8"` in
[android/app/build.gradle](../../../android/app/build.gradle) is what makes Android
generate `androidTest` tasks for that variant; without it `connectedDebugR8AndroidTest`
does not exist at all.

Two extra R8 rule files, both scoped to `debugR8` and touching the release not at all:

- `proguard-rules-testable-app.pro` applies to the **app** and keeps the few names the
  instrumented tests refer to. Without it the tests fail with `NoClassDefFoundError` while
  the app works perfectly — a false alarm far more expensive than the bytes it saves. The
  release keeps nothing extra, so those names are the only difference between the variants.
- `proguard-rules-test-apk.pro` applies through `testProguardFiles` to the **test APK**
  itself, which AGP must minify because it links against an obfuscated app. AndroidX test
  libraries reference optional classes that are not on the classpath (`ViewCapture` wants
  `SuspendToFutureAdapter`), and R8 treats that as fatal, stopping the build. The rule
  silences that warning for a package that never leaves a test device. It also keeps test
  classes and their annotated methods, because the runner discovers them by reflection
  where static analysis cannot see them — minifying them away would have produced a green
  run that executed nothing.

The card has four independent buttons, and the separation is deliberate:

| Button | Command | What it does |
| :-- | :-- | :-- |
| Build the package | `android:build:debug` | Fresh web → sync → `assembleDebugR8` plus the test package. **Touches no device** |

The same command is available from VS Code as **Android Debug R8 - بناء حزمة الاختبار** in
`.vscode/launch.json` (group **ASOL Capacitor**).
| Wipe the device and install | `android:device:install` | Detect → full verified wipe → install → grant permissions. **Builds nothing** |
| Host tests | `verify:all` | Repository checks on this machine |
| Connected-device tests | `android:device:tests` | `androidTest` on the phone |

Building is slow and safe; installing is fast and irreversible. Merging them would mean
that rebuilding just to check a compile error wipes your phone as a side effect, and that
wanting a reinstall costs a full build. And because installing builds nothing, it stops
with a clear message when no built package exists instead of starting a build nobody asked
for.

Wipe details and its guarantees are in
[installation-state-and-clean-testing.md](./installation-state-and-clean-testing.md).

Granting `POST_NOTIFICATIONS` automatically after install is deliberate: without it the
notification tests skip themselves instead of failing, and a suite that skips its way to
green is worse than one that fails.

### Two test buttons, on purpose

| Button | Command | Where it runs | What it answers |
| :-- | :-- | :-- | :-- |
| Host tests | `verify:all` | This machine | Types, lint, architecture contracts, and every test suite |
| Connected-device tests | `android:device:tests` | The phone | Whether notification channels, their permissions and their delivery actually work, and the web bundle as it entered the package |

The separation is not an organizational preference. `verify:all` runs `tsc`, `eslint` and
dozens of tsx scripts that read the file tree — there is no sense running those inside a
phone, and no Node environment on it. The converse holds too: a notification channel the
system actually registered cannot be seen by any check on the host. Either one alone leaves
half the picture, and merging them into a single button hides which half fell out.

`android:device:tests` refuses to treat a run with no tests as success: zero tests means an
empty or unbuilt suite, not a green result.

## Stage Reporting

A single job can take close to an hour, and "running" alone does not distinguish progress
from a hang. So the release scripts announce their own stages through `reportStage` in
`scripts/release-stage.ts`, which prints a line shaped `[stage] <id>`.

`nextBuildJobStage` trusts the announced stage over any inference from output text, and
does not subject it to a fixed `STAGE_ORDER`: step order differs between paths — publishing
verifies R2 before syncing Capacitor, a store release verifies nothing — and ranking them
against one sequence hid steps that actually ran. Text inference remains the fallback for
commands that announce no stages.

The stage appears on the command's own button and in the status bar, including the
`completed` stage the runner stamps when the operation succeeds.

A stage alone is not enough when it covers dozens of steps: `verify:all` spends its entire
run under the `testing` stage, so a reader cannot tell progress from a hang. The scripts
therefore also announce the current **step** through `reportStep`, shaped `[step] <text>` —
which check is running, which test, which package is being removed — and the runner stores
it in the `activity` field.

A step is free text rather than a fixed list: the set of checks changes, and any enum would
need editing with every addition. It is truncated at 80 characters because it renders inside
a button. On failure it stays visible because it names what was running at the moment of the
crash; on success it is cleared, because then it is only noise.
