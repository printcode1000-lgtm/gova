# ASOL Fastlane Module

This module prepares future Google Play and App Store publishing for the Capacitor app.

## Installed Runtime

- Ruby is expected on `PATH`, or at `C:\Ruby33-x64`.
- fastlane is pinned through the root `Gemfile`.
- Run through `npm run fastlane -- <platform> <lane>`.

## Lanes

- `android build`: builds the Android release AAB only.
- `android internal`: builds and uploads the AAB to Google Play internal testing.
- `ios build`: builds the iOS IPA on macOS/Xcode.
- `ios testflight`: builds and uploads the IPA to TestFlight on macOS/Xcode.

## Required Secrets

Never commit these files or values.

- `GOOGLE_PLAY_JSON_KEY_FILE`: path to the Google Play service-account JSON.
- `ASOL_ANDROID_PACKAGE_NAME`: defaults to `hgh.asol.app`.
- `FASTLANE_USER`: Apple ID email for App Store Connect.
- `ASOL_IOS_TEAM_ID`: Apple Developer Team ID.
- `ASOL_IOS_BUNDLE_ID`: defaults to `hgh.asol.app`.
- `FASTLANE_APPLE_APPLICATION_SPECIFIC_PASSWORD`: optional for Apple ID flows.

Recommended future App Store Connect API key variables:

- `APP_STORE_CONNECT_API_KEY_KEY_ID`
- `APP_STORE_CONNECT_API_KEY_ISSUER_ID`
- `APP_STORE_CONNECT_API_KEY_KEY_FILEPATH`

## Notes

- Android publishing can run from Windows after signing and Google Play credentials are configured.
- iOS publishing requires macOS with Xcode, even if this repository is prepared from Windows.
- The current Android Gradle project does not define release signing yet; add keystore-backed signing before production upload.
