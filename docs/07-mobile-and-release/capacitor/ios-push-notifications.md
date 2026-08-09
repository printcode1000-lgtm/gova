# iOS push notifications

## Registered identities

- Capacitor app ID / Apple bundle ID: `hgh.asol.app`
- Firebase project: `asole-73f1f`
- Firebase project number: `543298343631`
- Firebase Apple App ID: `1:543298343631:ios:9c65ac6e8871ec7c609dba`
- Encoded App ID: `app-1-543298343631-ios-9c65ac6e8871ec7c609dba`

The Firebase Apple registration belongs to the same application identity. Until
the Firebase Messaging iOS SDK is added to the Xcode project, Capacitor's Push
Notifications plugin returns a raw APNs device token, the API stores it with
provider `apns`, and delivery goes through the direct APNs HTTP/2 provider —
which is unconfigured by default. Android uses FCM.

The intended end state is Firebase Admin as the single transport for both
platforms. Only the Xcode step remains; see "Delivery path" below.

The complete Firebase Apple configuration downloaded from Firebase Console is
stored at `ios/App/App/GoogleService-Info.plist` and is included in the Xcode App
target resources. Firebase documents this client configuration as containing
project and application identifiers rather than server credentials. Keep the
complete file intact; do not copy it into `public/`, `out/`, or JavaScript env.

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

## Delivery path: Firebase Cloud Messaging

**Firebase Admin is the unified server-side push provider for both Android and
Apple.** The server holds one credential —
`FIREBASE_ADMIN_SERVICE_ACCOUNT_BASE64` — and Firebase Cloud Messaging forwards
Apple messages to APNs on Google's infrastructure.

`APNS_*` environment variables are **not required** for the normal flow.

```
Server ──► Firebase Admin (FCM HTTP v1) ──┬──► Android device
                                          └──► APNs ──► Apple device
```

### Provider selection is decided by the token, not the platform

`@capacitor/push-notifications` returns different tokens on Apple depending on
what is installed in the Xcode project:

| Xcode state | Token issued | Provider | Outcome |
|---|---|---|---|
| Firebase Messaging iOS SDK **installed** | Firebase registration token | `fcm` | Delivered through Firebase Admin |
| Firebase Messaging iOS SDK **absent** | Raw APNs device token (64 hex chars) | `apns` | Clear, actionable error |

`src/features/notifications/domain/push-token-kind.ts` classifies the token by
shape. This matters: a raw APNs token sent to FCM is rejected as
`INVALID_ARGUMENT`, and the send service treats that as a dead device and
deletes the registration. Classifying first prevents Apple devices from being
silently de-registered.

The routing is **self-correcting**: the moment the Firebase Messaging iOS SDK is
added, Apple devices begin issuing Firebase tokens and route to Firebase Admin
with no code change and no data migration. `NotificationTokenService.register`
accepts `ios`+`apns` and `ios`+`fcm`, `provider` is a free-text column, and the
registry already sends `fcm` tokens to `FcmNotificationProvider`.

The client lifecycle covers Apple as well: `NativePushController` gates on
`isNativePush()`, so received and tapped notifications reach the local
notification center on iOS exactly as they do on Android.

### Apple payload options

FCM ignores the `android` block for Apple tokens, so sound, priority, grouping,
and silent delivery are expressed in the `apns` block built by
`fcm-notification-provider.server.ts`:

| Concern | Alert push | Data-only push |
|---|---|---|
| `apns-push-type` | `alert` | `background` |
| `apns-priority` | `10` when high/critical, else `5` | `5` (APNs rejects `10`) |
| `aps.sound` | `custom_notification.caf`, omitted when the notification is `silent` | omitted |
| `aps.content-available` | omitted | `1` |
| `interruption-level` | `time-sensitive` when critical, `passive` when silent, else `active` | omitted |

On Apple there is no silent flag: the absence of a `sound` key *is* the silent
banner. The file name is declared once in
`src/features/notifications/domain/notification-sound.ts` and read by both Apple
transports, and `npm run ios:push:validate` fails if either stops using it.

## External Apple configuration still required

Native source configuration cannot create Apple credentials. Before testing on
a physical device or distributing a release:

1. Set the Xcode development team for the App target and use an App ID with the
   Push Notifications capability enabled.
2. Create an APNs authentication key (`.p8`) in the Apple Developer account.
3. **Upload that `.p8` key to Firebase**, not to this repository:

   > **Firebase Console → Project Settings → Cloud Messaging →
   > Apple app configuration → APNs Authentication Key → Upload**
   >
   > Provide the `.p8` file, the Key ID, and the Team ID.

   This is what authorises Firebase to deliver to APNs on the project's behalf.

   **The `.p8` key must never be committed to this repository.** It is a private
   signing key valid for every application under the Apple team account.

4. Install the Firebase Messaging iOS SDK in the Xcode project so Apple devices
   issue Firebase registration tokens (see the checklist below).
5. Test remote push on a physical device; the iOS simulator is not the release
   verification target for APNs registration.

### Optional: direct APNs transport

`ApnsNotificationProvider` remains available as an opt-in fallback. It is used
only when a device registered a raw APNs token, and only if `APNS_TEAM_ID`,
`APNS_KEY_ID`, and `APNS_PRIVATE_KEY` are configured (`APNS_BUNDLE_ID` defaults
to `hgh.asol.app`, and `APNS_PRODUCTION=true` selects the production host).
Leaving them unset is the supported default and produces a clear error rather
than a silent failure.

Its payload is deliberately simpler than the Firebase path: alert pushes always
use `apns-priority: 10` and a fixed badge value of `1`. The **sound is the same**
`custom_notification.caf` the Firebase path uses — it used to send the system
sound, which meant a device sounded different depending on which provider
happened to serve it. APNs responses `400` and `410` mark the token invalid, and
the send service soft-deletes it. The ES256 authorization JWT is cached for 50
minutes.

### Remaining Xcode step

Apple devices cannot issue Firebase tokens until the SDK is present:

1. In Xcode, add the `firebase-ios-sdk` Swift Package and select the
   **FirebaseMessaging** product for the App target.
2. Call `FirebaseApp.configure()` at the top of
   `application(_:didFinishLaunchingWithOptions:)` in `AppDelegate.swift`.
3. `GoogleService-Info.plist` is already committed and already a member of the
   App target's Resources — no further action needed for it.

Nothing on the API, database, or client side is waiting on this step: an Apple
device that registers a Firebase token is accepted and routed today.

Until this is done, Apple push registration succeeds, the token is stored with
provider `apns`, and sends return
`appleTokenNotDeliverable` explaining exactly what is missing.

## Known SPM compatibility boundary

The iOS project uses Swift Package Manager. During `cap sync ios`, Capacitor 8
reports that `@capacitor-mlkit/barcode-scanning` has no `Package.swift`; its npm
package currently ships iOS integration through CocoaPods only. The scanner is
therefore not registered in `CapApp-SPM`, while the other compatible Capacitor
plugins are synchronized normally. Moving the complete iOS shell from SPM to
CocoaPods is a separate native dependency migration and must be tested before
barcode scanning can be claimed as supported on iOS.
