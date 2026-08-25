# Fastlane Module

The local full-release shortcuts create their signed AAB and APK through `scripts/build-android-signed.ts`. This keeps local artifact creation available when Ruby/Fastlane is not installed, validates the signing environment, and verifies both produced signatures. Fastlane remains required for Google Play uploads; its Windows runner reports a missing Bundler installation explicitly.

Fastlane runs through `scripts/fastlane-runner.ts` so that Ruby/Bundler runs consistently on Windows and every lane receives the authoritative release environment plus scoped secret auto-restore before Ruby starts.

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

For complete Mac/iOS setup and automated agent instructions, see [ios-mac-execution-agent-prompt.md](./ios-mac-execution-agent-prompt.md).

## Safety

Any lane using `upload_to_play_store` must remain on `Release` only. The `npm run android:r8:validate` validator fails if `ReleaseNoR8` or `no_r8` appears inside a lane publishing to Play.
