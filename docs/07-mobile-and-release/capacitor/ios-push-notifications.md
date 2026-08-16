# iOS push notifications

## Registered identities

- Capacitor app ID / Apple bundle ID: `hgh.asol.app`
- Firebase project: `asole-73f1f`
- Firebase project number: `543298343631`
- Firebase Apple App ID: `1:543298343631:ios:9c65ac6e8871ec7c609dba`
- Encoded App ID: `app-1-543298343631-ios-9c65ac6e8871ec7c609dba`

The Firebase Apple registration belongs to the same application identity. The
Firebase Messaging iOS SDK (`firebase-ios-sdk` pinned to exact version `12.17.0`)
is configured via Swift Package Manager in the App target of `project.pbxproj`.
Apple devices obtain an FCM registration token from Firebase Messaging, which is
forwarded via `AppDelegate.swift` to Capacitor, stored with provider `fcm`, and
delivered through the unified Firebase Admin transport.

Firebase Admin is the single push transport for both Android and Apple platforms.

The complete Firebase Apple configuration downloaded from Firebase Console is
stored at `ios/App/App/GoogleService-Info.plist` and is included in the Xcode App
target resources. Firebase documents this client configuration as containing
project and application identifiers rather than server credentials. Keep the
complete file intact; do not copy it into `public/`, `out/`, or JavaScript env.

## Native configuration

- `App/App.entitlements` enables `aps-environment`.
- Debug signs for the APNs development environment.
- Release signs for the APNs production environment.
- `Info.plist` sets `FirebaseAppDelegateProxyEnabled` to `false`. Swizzling is
  disabled so `AppDelegate.swift` explicitly and deterministically manages APNs
  token handover and FCM token forwarding.
- `AppDelegate.swift` calls `FirebaseApp.configure()`, sets `Messaging.messaging().delegate`,
  hands the raw APNs device token to `Messaging.messaging().apnsToken`, and forwards
  the FCM token string Firebase returns for it to Capacitor, and forwards APNs registration
  failures unchanged.
- Foreground presentation uses badge, sound, banner, and notification-list
  options supported by Capacitor 8.

Run `npm run ios:push:validate` to verify that these settings, SPM dependencies,
swizzling flags, and registered identities remain aligned.

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

`@capacitor/push-notifications` receives different tokens on Apple depending on
what is installed in the Xcode project:

| Xcode state | Token issued | Provider | Outcome |
|---|---|---|---|
| Firebase Messaging iOS SDK **configured** (current state) | Firebase registration token | `fcm` | Delivered through Firebase Admin |
| Firebase Messaging iOS SDK **absent** | Raw APNs device token (64 hex chars) | `apns` | Opt-in fallback if `APNS_*` configured; clear error if omitted |

`src/features/notifications/domain/push-token-kind.ts` classifies the token by
shape. This matters: a raw APNs token sent to FCM is rejected as
`INVALID_ARGUMENT`, and the send service treats that as a dead device and
deletes the registration. Classifying first prevents Apple devices from being
silently de-registered.

The routing is **self-correcting**: with the Firebase Messaging iOS SDK configured,
Apple devices issue Firebase registration tokens and route to Firebase Admin with
no code change and no data migration. `NotificationTokenService.register`
accepts `ios`+`apns` and `ios`+`fcm`, `provider` is a free-text column, and the
registry already sends `fcm` tokens to `FcmNotificationProvider`.

The client lifecycle covers Apple as well: `NativePushController` gates on
`isNativePush()`, so received and tapped notifications reach the local
notification center on iOS exactly as they do on Android.

The post-login opt-in dialog is separate and platform-agnostic — it lives in
`NotificationOptInController` and offers the same opt-in on iOS.

One difference: when the permission is blocked, iOS shows the re-check recovery
rather than an "open settings" button, because `PermissionManager.openSettings`
is implemented by the Android shell only and reports `canOpenSettings() === false`
on Apple. Shipping the iOS side of that plugin is what would flip it. See
[Post-Login Opt-In Dialog](../../05-platform-features/notification-system.md#post-login-opt-in-dialog).

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

4. Build the iOS application on macOS so SPM resolves `firebase-ios-sdk` version `12.17.0`
   and generates `Package.resolved`.
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

### Xcode SPM integration and token handover details

The Xcode integration is configured deterministically as follows:

1. **SPM Dependency**: `ios/App/App.xcodeproj/project.pbxproj` declares an
   `XCRemoteSwiftPackageReference` to `https://github.com/firebase/firebase-ios-sdk.git`
   pinned to exact version `12.17.0`. The tag was confirmed present upstream on 2026-08-16
   with `git ls-remote --tags`, it is the newest stable release, and its own `Package.swift`
   declares `.iOS(.v15)` — the same floor as `IPHONEOS_DEPLOYMENT_TARGET = 15.0` here, so it
   is the newest version this project can take. The pin is exact for reproducible resolution,
   matching how `capacitor-swift-pm` is pinned. The `FirebaseMessaging` product
   dependency is linked strictly to the **App target** (excluding `ShareExtension`).

   Raising the pin later means re-checking that floor first: a Firebase major that moves to
   iOS 16 cannot be adopted without also raising the app's deployment target, which is a
   separate decision about which devices the app still supports.
2. **Swizzling Disabled**: `Info.plist` contains `<key>FirebaseAppDelegateProxyEnabled</key><false/>`.
   Disabling swizzling prevents dual-ownership race conditions between Firebase auto-swizzling
   and explicit `AppDelegate` callbacks. Because swizzling is disabled, Firebase's `appDidReceiveMessage`
   is never called, so Firebase's own delivery analytics are not recorded — delivery itself is
   unaffected because it runs through APNs and `UNUserNotificationCenter`, which Capacitor owns.
3. **AppDelegate Handover**:
   - `didRegisterForRemoteNotificationsWithDeviceToken`: Hands the raw `Data` device token
     to `Messaging.messaging().apnsToken = deviceToken`. Does **not** post raw `Data` to Capacitor.
   - `messaging(_:didReceiveRegistrationToken:)`: Guards against nil/empty tokens and posts
     the **FCM token String** to `NotificationCenter.default` under `.capacitorDidRegisterForRemoteNotifications`.
   - Token rotation: Firebase invokes `didReceiveRegistrationToken` when a token rotates, and
     the AppDelegate forwards it. `NativePushService.ensureListeners()` keeps a permanent
     `onPushToken` subscriber; `DeviceTokenService.initialize()` injects the handler that
     stores the new token locally and re-registers it with the server. The handler stands
     down while `register()` is in flight, ignores a value it has already reported, and does
     nothing at all on a device whose push switch is off — so one rotation produces exactly
     one server registration, and never opts a device back in. Rotation is handled on both
     Android (via `AsolPushMessagingService.onNewToken`) and iOS (via
     `messaging(_:didReceiveRegistrationToken:)`).

### Physical Apple Device Verification Checklist

To verify compilation and delivery on a physical iOS device:

1. **macOS Xcode Build**: Open `ios/App/App.xcworkspace` in Xcode on macOS, allow SPM to resolve `firebase-ios-sdk@12.17.0` (which generates `Package.resolved`), and build to a physical Apple device.
2. **Token Inspection**: Trigger push registration on the device and verify that the registered token string is an FCM registration token (not 64 hex characters).
3. **Database Verification**: Check the database row in `user_notification_tokens` for the target `uid`: confirm `platform = ios` and `provider = fcm`.
4. **Real Push Test**: Navigate to `/super-admin/notification-tests` in the web application, select Real Push mode, and trigger a test notification to the test user.
5. **Application States**: Verify push delivery across all three application states:
   - **Foreground**: Banner, badge, and notification-center entry update while the app is active.
   - **Background**: Banner notification appears while the app is minimized.
   - **Terminated**: Banner notification appears after the app process is swiped away.
6. **Custom Sound**: Verify that the alert push plays `custom_notification.caf`.
   *Note: Audible sound cannot be objectively confirmed programmatically; manual human verification listening to device output is required.*

## Known SPM compatibility boundary

The iOS project uses Swift Package Manager. During `cap sync ios`, Capacitor 8
reports that `@capacitor-mlkit/barcode-scanning` has no `Package.swift`; its npm
package currently ships iOS integration through CocoaPods only. The scanner is
therefore not registered in `CapApp-SPM`, while the other compatible Capacitor
plugins are synchronized normally. Moving the complete iOS shell from SPM to
CocoaPods is a separate native dependency migration and must be tested before
barcode scanning can be claimed as supported on iOS.
