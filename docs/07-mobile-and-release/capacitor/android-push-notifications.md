# Android Push Notifications

## Scope

ASOL Android uses Firebase Cloud Messaging through the official Capacitor 8 Push Notifications plugin. The integration covers foreground, background, and terminated application states while keeping the in-app notification center local-first in AsolDB.

## Firebase Identity

- Firebase project: `asole-73f1f`
- Project number: `543298343631`
- Android App ID: `1:543298343631:android:01192cf95a765130609dba`
- Android package: `hgh.asol.app`

`scripts/sync-android-push-assets.ts` validates all four values before every Capacitor sync. A mismatch fails the build.

## Build Assets

Source sound file:

```text
assets/google-play/custom_notification.mp3
```

Generated Android files:

```text
android/app/google-services.json
android/app/src/main/res/raw/custom_notification.mp3
```

`google-services.json` is no longer stored in the repository. Its complete lossless JSON is held in `FIREBASE_ANDROID_GOOGLE_SERVICES_BASE64` and is regenerated only inside `android/app` during a native build. The generated files are ignored by Git. `npm run cap:sync`, `npm run cap:copy`, `npm run cap:build`, and `npm run cap:build:local` validate the Firebase project identity and synchronize the generated config and sound automatically.

The Firebase service-account JSON is server-only, ignored by Git, and must never enter Android, static output, R2, OTA, or client JavaScript.

## Vercel Secrets

The server requires:

```text
FIREBASE_ADMIN_SERVICE_ACCOUNT_BASE64   # notifications account only
FIREBASE_ANDROID_GOOGLE_SERVICES_BASE64 # main app only, for the native build
ASOL_NOTIFICATION_GRANT_SECRET          # both accounts, byte-identical
```

These live on **different** Vercel accounts.
`FIREBASE_ADMIN_SERVICE_ACCOUNT_BASE64` belongs to the notifications service,
which is the only side that delivers push.
`FIREBASE_ANDROID_GOOGLE_SERVICES_BASE64` belongs to the main app, which is the
only side that builds the Android project. `ASOL_NOTIFICATION_GRANT_SECRET` is
shared: the main app signs a grant with it and the service verifies. See
[Notifications Service Module](../../05-platform-features/notifications-service-module.md).

The first two are lossless base64 encodings of the complete server and Android Firebase JSON documents. Explicit `FIREBASE_PROJECT_*`, `FIREBASE_FCM_SENDER_ID`, `FIREBASE_ANDROID_*`, and `FIREBASE_STORAGE_BUCKET` variables document and validate the Android Firebase identity without exposing the server private key.

## Client Lifecycle

`NativePushController` is mounted once below `SessionProvider`. It runs on both
native platforms — the gate is `isNativePush()` — so the lifecycle below applies
to Android and iOS alike. Android-only steps (channel creation) are guarded
inside `CapacitorPushService`.

1. After session hydration, it initializes native listeners.
2. It creates all Android notification channels.
3. It imports notifications still present in the Android notification tray, except notifications the user already dismissed locally and empty `ASOL` placeholders with no body or payload.
4. If the user previously enabled notifications, it re-registers with FCM on startup to refresh the token timestamp.
5. Foreground notifications are saved to AsolDB, refresh the badge, and are displayed as a local notification on the resolved channel — Firebase shows nothing itself while the app is visible, so without this step a foreground push on Android is silent and invisible. Data-only deliveries, specialty-chat receipts, and locally dismissed identities are skipped. iOS is excluded because the OS already presents it from `presentationOptions`.
6. Tapping a background or terminated-state notification saves it, marks it read, and opens its validated internal route. A notification the device displayed itself arrives through the local-notification listener instead and takes the same path, so its deep link is not lost.
7. Signing out unregisters the token on every platform: `useLogout` calls the shared device-token service before clearing the session, and the controller also unregisters the previous uid when the account changes. Clearing application data unregisters before local storage is erased.
8. Switching the app language re-registers the token so push text follows the new language.

Dismissed notification identities are remembered locally by `id` and
`dedupeKey`. Android tray import checks that list before saving delivered
notifications, so deleting an item from `/notifications` prevents it from
appearing again when the app resumes. If an Android payload does not provide a
stable id, the adapter derives a stable fallback from the title, body, and route
instead of using the current time.

The web push path mirrors the same center behavior through
`public/asol-push-sw.js`: incoming browser push payloads include the target
`uid`, are stored in the local AsolDB notification list, refresh the local
badge, and notify open app windows so `/notifications` updates immediately.
The service worker also checks the same local dismissed list before storing.

Permission is requested only after an explicit user action. Android 13 and newer use the native `POST_NOTIFICATIONS` permission through the Capacitor plugin.

## Channels

| Channel | Purpose | Importance | Sound | Vibration |
| --- | --- | --- | --- | --- |
| `asol_general_v2` | General and system notifications | 4 | `custom_notification.mp3` | Yes |
| `asol_orders_v2` | Orders, shipping, and returns | 4 | `custom_notification.mp3` | Yes |
| `asol_chat_v2` | Chat and messages | 4 | `custom_notification.mp3` | Yes |
| `asol_urgent_v2` | Critical and urgent notifications | 5 | `custom_notification.mp3` | Yes |
| `asol_updates_v2` | General update notifications | 4 | `custom_notification.mp3` | Yes |
| `asol_silent_v2` | Notifications declared `sound: "silent"` | 2 | none | No |

Channel IDs are versioned because Android does not allow an application to replace the sound configuration of an already-created channel. Users can still override channel behavior from Android system settings.

Importance is what makes the silent channel silent. Android plays a channel's
sound from importance 3 upward, and a channel created *without* a sound still
inherits the system sound — omitting the file is not enough on its own.

Channel selection lives in
[`src/features/notifications/domain/notification-sound.ts`](../../../src/features/notifications/domain/notification-sound.ts)
and is shared by the server FCM provider and the on-device local notification,
so a notification sounds the same whichever displayed it. In order:

1. Sound `silent` → `asol_silent_v2`. It wins over everything: a low-importance channel is the only way to deliver without a sound.
2. Priority `critical` or sound `urgent` → `asol_urgent_v2`. There is one sound asset, so `urgent` cannot mean a different file; it means the channel that interrupts.
3. Metadata `source = super_admin_broadcast` → `asol_updates_v2`, so a user can silence announcements from Android settings without silencing their orders.
4. Category `orders` → `asol_orders_v2`.
5. Category `chat` → `asol_chat_v2`.
6. Everything else → `asol_general_v2`.

## Server Delivery

`FcmNotificationProvider`:

- Resolves Arabic or English templates before delivery.
- Sends notification and data payloads together.
- Sends `sound` as the extensionless resource name (`custom_notification`). FCM resolves a raw resource by base name; sending the extension makes the lookup fail and Android falls back to the system sound with no error anywhere. The field is consulted only below Android 8 — from 8 upward the channel owns the sound — and is omitted for a `silent` notification so old devices stay silent too.
- Restricts delivery to `hgh.asol.app`.
- Includes notification ID, dedupe key, route, category, priority, sound, group, and timestamps.
- Sends one HTTP v1 message per token; there is no multicast batch.
- Uses high Android priority only for high or critical ASOL notifications.
- Returns sent, partial, or failed results.
- Soft-deletes tokens rejected as `UNREGISTERED` or `INVALID_ARGUMENT` by setting `enabled = false` and `deleted_at`.
- Keeps every token when Firebase itself is unconfigured, and returns `firebaseAdminNotConfigured`.
- Uses the official FCM HTTP v1 endpoint with OAuth service-account authentication.
- Limits concurrent HTTP v1 requests to 25 to protect the server and Firebase quota.
- Never logs credentials or raw token values.

## Security Boundary

The Firebase private key is loaded only by server code. Device-token registration verifies the supplied uid and phone against the users database and validates platform/provider combinations and input sizes. The general multi-user send route requires a server-only bearer secret. The super-admin broadcast route retains its super-admin identity check and calls the server delivery service directly.

The project uses client-persisted sessions with a signed, expiring server token issued after password login. Specialty-chat APIs require that signature in addition to checking the current UID and phone. Device-token registration retains its existing UID/phone compatibility contract.

## Verification

```bash
npm run android:push:sync-assets
npm run cap:sync
npm run test:notifications
npm run typecheck
npm run architecture:check
cd android
./gradlew :app:assembleDebug
```

After installing the debug or release build on a physical Android device:

1. Sign in.
2. Open Settings and enable Android notifications.
3. Confirm the device appears under `/super-admin/notifications-broadcast` with provider `fcm`.
4. Send a test while the app is open.
5. Send another while the app is in the background.
6. Swipe the app away from recent apps, send another, and tap it from the system tray.
7. Confirm the custom sound, notification-center entry, unread badge, and deep link.
8. Delete the notification from `/notifications`, leave the page, return, and confirm it does not reappear and the bottom badge count is updated.
