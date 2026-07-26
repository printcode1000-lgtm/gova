# Fastlane Publishing Module

The ASOL fastlane module prepares future Google Play and App Store publishing for the Capacitor app.

## Current App Identity

- Android package: `hgh.asol.app`
- iOS bundle id: `hgh.asol.app`
- Google Play service account: `fastlane@asole-73f1f.iam.gserviceaccount.com`
- Google Play service account unique id: `111043929087553456734`

## Local Credential Files

These files are intentionally ignored by Git:

- `assets/google-play/asole-73f1f-dc494a4b5159.json`
- `assets/google-play/k.jks`
- `fastlane/.env`

## Android Required Variables

The module already stores the non-password defaults in `fastlane/.env`.

- `GOOGLE_PLAY_JSON_KEY_FILE=assets/google-play/asole-73f1f-dc494a4b5159.json`
- `GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL=fastlane@asole-73f1f.iam.gserviceaccount.com`
- `GOOGLE_PLAY_SERVICE_ACCOUNT_UNIQUE_ID=111043929087553456734`
- `ASOL_ANDROID_PACKAGE_NAME=hgh.asol.app`
- `GOOGLE_PLAY_TRACK=internal`
- `ASOL_ANDROID_KEYSTORE_FILE=assets/google-play/k.jks`

Still required before Android release build/upload:

- `ASOL_ANDROID_KEYSTORE_PASSWORD`
- `ASOL_ANDROID_KEY_ALIAS`
- `ASOL_ANDROID_KEY_PASSWORD`

## Commands

- `npm run fastlane -- lanes`
- `npm run fastlane:android:doctor`
- `npm run fastlane:android:build`
- `npm run fastlane:android:internal`
- `npm run fastlane:ios:build`
- `npm run fastlane:ios:testflight`

## Notes

- Android upload requires that the service account has access to the app in Google Play Console.
- Android release build requires the keystore password, key alias, and key password.
- iOS build/upload requires macOS and Xcode.
- App Store Connect is best configured later with an API key rather than Apple ID password flows.
