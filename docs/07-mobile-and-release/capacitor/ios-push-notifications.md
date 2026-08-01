# iOS push notifications

## Registered identities

- Capacitor app ID / Apple bundle ID: `hgh.asol.app`
- Firebase project: `asole-73f1f`
- Firebase project number: `543298343631`
- Firebase Apple App ID: `1:543298343631:ios:9c65ac6e8871ec7c609dba`
- Encoded App ID: `app-1-543298343631-ios-9c65ac6e8871ec7c609dba`

The Firebase Apple registration belongs to the same application identity, but
the current ASOL notification architecture sends to Apple devices directly
through APNs. Capacitor's Push Notifications plugin returns an APNs device token
on iOS, the API stores it with provider `apns`, and the server sends it through
the APNs HTTP/2 provider. Android continues to use FCM.

Do not add `FirebaseMessaging` or change iOS tokens to provider `fcm` without a
coordinated client, API, database, and notification-provider migration.

## Native configuration

- `App/App.entitlements` enables `aps-environment`.
- Debug signs for the APNs development environment.
- Release signs for the APNs production environment.
- `AppDelegate.swift` forwards successful and failed remote-notification
  registration to Capacitor.
- Foreground presentation uses badge, sound, banner, and notification-list
  options supported by Capacitor 8.

Run `npm run ios:push:validate` to verify that these settings and all registered
identities remain aligned.

## External Apple configuration still required

Native source configuration cannot create Apple credentials. Before testing on
a physical device or distributing a release:

1. Set the Xcode development team for the App target and use an App ID with the
   Push Notifications capability enabled.
2. Create an APNs authentication key (`.p8`) in the Apple Developer account.
3. Configure the server-only values `APNS_TEAM_ID`, `APNS_KEY_ID`,
   `APNS_BUNDLE_ID=hgh.asol.app`, `APNS_PRIVATE_KEY`, and set
   `APNS_PRODUCTION=true` for production delivery.
4. Test remote push on a physical device; the iOS simulator is not the release
   verification target for APNs registration.

If Firebase Cloud Messaging is intentionally adopted for iOS in the future,
download the complete `GoogleService-Info.plist` from Firebase Console and add
it to the App target. The App ID shown in the console is not sufficient to
reconstruct that plist safely.

## Known SPM compatibility boundary

The iOS project uses Swift Package Manager. During `cap sync ios`, Capacitor 8
reports that `@capacitor-mlkit/barcode-scanning` has no `Package.swift`; its npm
package currently ships iOS integration through CocoaPods only. The scanner is
therefore not registered in `CapApp-SPM`, while the other compatible Capacitor
plugins are synchronized normally. Moving the complete iOS shell from SPM to
CocoaPods is a separate native dependency migration and must be tested before
barcode scanning can be claimed as supported on iOS.
