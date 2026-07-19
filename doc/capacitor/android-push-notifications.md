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
FIREBASE_ADMIN_SERVICE_ACCOUNT_BASE64
FIREBASE_ANDROID_GOOGLE_SERVICES_BASE64
ASOL_NOTIFICATION_INTERNAL_SECRET
```

All values are configured for Production, Preview, and Development in the linked Vercel project. The first two are lossless base64 encodings of the complete server and Android Firebase JSON documents. The third protects the internal multi-user send API. Explicit `FIREBASE_PROJECT_*`, `FIREBASE_FCM_SENDER_ID`, `FIREBASE_ANDROID_*`, and `FIREBASE_STORAGE_BUCKET` variables document and validate the Android Firebase identity without exposing the server private key.

## Client Lifecycle

`AndroidPushController` is mounted once below `SessionProvider`.

1. After session hydration, it initializes native listeners.
2. It creates all Android notification channels.
3. It imports notifications still present in the Android notification tray.
4. If the user previously enabled notifications, it re-registers with FCM on startup to refresh the token timestamp.
5. Foreground notifications are saved to AsolDB and refresh the badge.
6. Tapping a background or terminated-state notification saves it, marks it read, and opens its validated internal route.
7. Logout, account deletion, and clearing application data unregister the native token before local storage is erased.

The web push path mirrors the same center behavior through
`public/asol-push-sw.js`: incoming browser push payloads include the target
`uid`, are stored in the local AsolDB notification list, refresh the local
badge, and notify open app windows so `/notifications` updates immediately.

Permission is requested only after an explicit user action. Android 13 and newer use the native `POST_NOTIFICATIONS` permission through the Capacitor plugin.

## Channels

| Channel | Purpose | Sound |
| --- | --- | --- |
| `asol_general_v1` | General and system notifications | `custom_notification.mp3` |
| `asol_orders_v1` | Orders, shipping, and returns | `custom_notification.mp3` |
| `asol_chat_v1` | Chat and messages | `custom_notification.mp3` |
| `asol_urgent_v1` | Critical notifications | `custom_notification.mp3` |
| `asol_silent_v1` | Silent updates | None |

Channel IDs are versioned because Android does not allow an application to replace the sound configuration of an already-created channel. Users can still override channel behavior from Android system settings.

## Server Delivery

`FcmNotificationProvider`:

- Resolves Arabic or English templates before delivery.
- Sends notification and data payloads together.
- Restricts delivery to `hgh.asol.app`.
- Includes notification ID, dedupe key, route, category, priority, sound, group, and timestamps.
- Sends at most 500 tokens per Firebase batch.
- Uses high Android priority only for high or critical ASOL notifications.
- Returns sent, partial, or failed results.
- Disables tokens rejected as invalid or unregistered.
- Uses the official FCM HTTP v1 endpoint with OAuth service-account authentication.
- Limits concurrent HTTP v1 requests to 25 to protect the server and Firebase quota.
- Never logs credentials or raw token values.

## Security Boundary

The Firebase private key is loaded only by server code. Device-token registration verifies the supplied uid and phone against the users database and validates platform/provider combinations and input sizes. The general multi-user send route requires a server-only bearer secret. The super-admin broadcast route retains its super-admin identity check and calls the server delivery service directly.

The project currently uses client-persisted sessions. Therefore uid-and-phone verification is the strongest device-registration ownership check available without introducing a signed server session.

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
