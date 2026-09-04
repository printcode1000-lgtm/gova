# Fastlane Module

The local full-release shortcuts create their signed AAB and APK through `scripts/build-android-signed.ts`. This keeps local artifact creation available when Ruby/Fastlane is not installed, validates the signing environment, and verifies both produced signatures. Fastlane remains required for Google Play uploads; its Windows runner reports a missing Bundler installation explicitly.

Fastlane runs through `scripts/fastlane-runner.ts` so that Ruby/Bundler runs consistently on Windows and every lane receives the authoritative release environment plus scoped secret auto-restore before Ruby starts.

## Command Surface

Every lane is reached through an npm script; nothing calls `bundle exec fastlane`
directly, because the runner is what restores the scoped secrets and normalises
Ruby/Bundler on Windows before Ruby starts.

| Command | Lane |
| --- | --- |
| `npm run fastlane -- <platform> <lane>` | any lane, passed straight through |
| `npm run fastlane:android:doctor` | `android doctor` |
| `npm run fastlane:android:build` | `android build` |
| `npm run fastlane:android:aab:signed` | `android aab_signed` |
| `npm run fastlane:android:aab:unsigned` | `android aab_unsigned` |
| `npm run fastlane:android:apk:signed` | `android apk_signed` |
| `npm run fastlane:android:apk:unsigned` | `android apk_unsigned` |
| `npm run fastlane:android:aab:signed:no-r8` | `android aab_signed_no_r8` |
| `npm run fastlane:android:aab:unsigned:no-r8` | `android aab_unsigned_no_r8` |
| `npm run fastlane:android:apk:signed:no-r8` | `android apk_signed_no_r8` |
| `npm run fastlane:android:apk:unsigned:no-r8` | `android apk_unsigned_no_r8` |
| `npm run fastlane:android:internal` | `android internal` |
| `npm run fastlane:android:production` | `android production` |
| `npm run fastlane:ios:build` | `ios build` |
| `npm run fastlane:ios:testflight` | `ios beta` |

The iOS `doctor` lane has no npm alias; reach it with
`npm run fastlane -- ios doctor`.

## Android Lanes

Current release lanes:

- `doctor`
- `build`
- `aab_signed`
- `aab_unsigned`
- `apk_signed`
- `apk_unsigned`
- `internal`
- `production`

New diagnostic no-R8 lanes never upload to Google Play:

- `aab_signed_no_r8`
- `aab_unsigned_no_r8`
- `apk_signed_no_r8`
- `apk_unsigned_no_r8`

## Track And Rollout Capabilities

The release dashboard can read and update tracks: `internal`, `alpha`, `beta`, and `production`. Staged rollout can be configured via `userFraction`, stopped with `halted` status, resumed, or completed with `completed` status. Release notes can also be attached for each language and an existing `versionCode` promoted from one track to another without a new build.

## iOS Lanes (Requires macOS)

- `doctor`: Validate the iOS signing-team prerequisite (`ASOL_IOS_TEAM_ID`).
- `build`: Build and export signed iOS application archive (`ASOL.ipa`).
- `beta`: Build and upload application archive directly to TestFlight.

The `beta` lane fails closed while `config/shipping-platforms.json` declares
`ios.storeDistribution=false`. Enabling the command requires an explicit
shipping declaration and App Store Connect credentials; missing credentials do
not implicitly enable or disable the platform. The API key is passed explicitly
to `upload_to_testflight`, so the enabled release path remains non-interactive.

## Safety

Any lane using `upload_to_play_store` must remain on `Release` only. The `npm run android:r8:validate` validator fails if `ReleaseNoR8` or `no_r8` appears inside a lane publishing to Play.
