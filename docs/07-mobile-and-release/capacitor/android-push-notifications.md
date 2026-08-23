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

Notification icon identity is owned by `@asol/branding-core`:

- `ic_stat_asol_notification` is generated as a transparent white ASOL-tree
  silhouette for every Android density. Android status-bar icons cannot use the
  full-colour launcher bitmap.
- `asol_notification_large_icon` is generated in full colour and displayed by
  `AsolPushMessagingService` in expanded notifications.
- The application manifest's Firebase default, FCM payload builders, Capacitor
  local notifications, and the application-owned receiver all use the same
  resource contract.

Run `npm run branding:generate` after changing the package SSOT. See
[Branding SSOT](branding-ssot.md).

`google-services.json` is no longer stored in the repository. Its complete lossless JSON is held in `FIREBASE_ANDROID_GOOGLE_SERVICES_BASE64` and is regenerated only inside `android/app` during a native build. The generated files are ignored by Git. `npm run cap:sync`, `npm run cap:copy`, `npm run cap:build`, and `npm run cap:build:local` validate the Firebase project identity and synchronize the generated config and sound automatically.

The Firebase service-account JSON is server-only, ignored by Git, and must never enter Android, static output, R2, OTA, or client JavaScript.

## Vercel Secrets

The server requires:

```text
FIREBASE_ADMIN_SERVICE_ACCOUNT_BASE64   # notifications account — web fan-out
FIREBASE_ANDROID_GOOGLE_SERVICES_BASE64 # main app — native Android build
ASOL_NOTIFICATION_GRANT_SECRET          # both accounts, byte-identical
ASOL_MOBILE_PUSH_UNLOCK_KEY             # main app only — native outbound push unlock
ASOL_MOBILE_PUSH_CREDENTIAL_BLOB        # main app server — optional mismatch guard
NEXT_PUBLIC_ASOL_MOBILE_PUSH_CREDENTIAL_BLOB  # main app — baked into static/Capacitor bundles
```

Provision the last three locally with `npm run provision:mobile-push` after
`FIREBASE_ADMIN_SERVICE_ACCOUNT_BASE64` is set in `.env.local`.

These live on **different** Vercel accounts where noted.
`FIREBASE_ADMIN_SERVICE_ACCOUNT_BASE64` belongs to the notifications service,
which delivers push on **web**.
`FIREBASE_ANDROID_GOOGLE_SERVICES_BASE64` belongs to the main app, which builds
the Android project. `ASOL_NOTIFICATION_GRANT_SECRET` is shared: the main app
signs a grant with it and the service (or the main app's `recipient-tokens` route
on native) verifies it. See
[Notifications Service Module](../../05-platform-features/notifications-service-module.md)
and [Notification Bridge Module](../../05-platform-features/notification-bridge-module.md).

The first two are lossless base64 encodings of the complete server and Android Firebase JSON documents. Explicit `FIREBASE_PROJECT_*`, `FIREBASE_FCM_SENDER_ID`, `FIREBASE_ANDROID_*`, and `FIREBASE_STORAGE_BUCKET` variables document and validate the Android Firebase identity without exposing the server private key.

## Native outbound push (installed shells)

On Capacitor, the device that triggered a business action may **send** push to
other users' devices directly via FCM HTTP v1. The main app:

- verifies grants and returns recipient tokens (`/api/notifications/recipient-tokens`);
- decrypts the embedded credential blob after identity check (`/api/notifications/mobile-push/unlock`).

The device stores unlocked credentials re-encrypted under a device-local key.
Sign-out clears them (`clearMobilePushCredentials`).

Every outbound Android payload includes `androidChannelId` from
`resolveAndroidChannelId`, matching the server FCM provider and the native
receive path. Channels are created in `AsolNotificationChannels` before send and
at activity startup — see [Notification Bridge Module](../../05-platform-features/notification-bridge-module.md#android-channel-compatibility).

## Client Lifecycle

`NativePushController` is mounted once below `SessionProvider`. It runs on both
native platforms — the gate is `isNativePush()` — so the lifecycle below applies
to Android and iOS alike. Android-only steps (channel creation) are guarded
inside `CapacitorPushService`.

The post-login opt-in dialog is **not** part of this controller. It lives in
`NotificationOptInController`, which runs on every platform including the
browser. See
[Post-Login Opt-In Dialog](../../05-platform-features/notification-system.md#post-login-opt-in-dialog).

1. After session hydration, it initializes native listeners and ensures every Android channel exists.
2. It drains the application-owned, uid-scoped native inbox into IndexedDB and acknowledges each native record only after IndexedDB durably accepts it.
3. It then sweeps notifications still present in the Android tray only as a compatibility fallback for older shells. New inbox-owned tray entries carry a native marker and are excluded from this lossy reconstruction path.
4. It consumes a pending tap last, marks only its stored notification read, and opens `/notifications`. The business route stays on the card for the user to open from the centre.
5. If the user previously enabled notifications, it re-registers with FCM on startup to refresh the token timestamp.
6. Foreground notifications are saved to AsolDB, refresh the badge, and are displayed as a local notification on the resolved channel. The custom native receiver does not post in the foreground, so there is one banner and one sound. iOS remains on the platform presentation path.
7. Signing out unregisters the token on every platform: `useLogout` calls the shared device-token service before clearing the session, and the controller also unregisters the previous uid when the account changes. It does not delete another user's pending native records; account deletion and explicit local-data clearing do.
8. Switching the app language re-registers the token so push text follows the new language.

The order, end to end:

```text
MainActivity.onCreate (UI startup)
  → create channels with the final custom sound
  → show the ASOL explanation dialog
  → request POST_NOTIFICATIONS
      granted → register with FCM
      denied  → keep the channels, register nothing, post nothing
```

Channel creation never depends on `POST_NOTIFICATIONS`. `MainActivity.onCreate`
is the activity's UI startup — not `Application.onCreate`, and not a
process-wide hook — and it creates the complete v4 channel set there, before the
WebView exists. Native push initialization creates it again idempotently. Both
run before the permission dialog. Creating a channel posts nothing and requires
no grant; it only declares what the Android settings screen lists, so the user
sees real ASOL channels the moment they open notification settings. Registration
with FCM still happens only after the grant: a denied device keeps its channels
and registers no token.

Sound, importance, and vibration are fixed when a channel is first created and
cannot be changed afterwards. The first creation on a device must therefore
already carry the final custom sound, and changing any of those behaviours later
requires a new channel-id generation — which discards every per-channel
preference the user has set. See
[Channel generations](../../05-platform-features/notification-system.md#sound-and-channels).

The channel set is created only by the application-owned native bridge, never by
Capacitor's string-based `createChannel`. The Java side sets the sound from a
**resource-name** URI:

```text
android.resource://hgh.asol.app/raw/custom_notification
```

A channel outlives the install that created it, while a numeric resource id is
regenerated by every build; a persisted numeric id can therefore point at a
different resource, or at none, after an upgrade — and the sound could never be
repaired. The name is resolved by the system each time the sound plays. The
numeric `R.raw.custom_notification` reference is still read in code, and only
there, so Release resource shrinking keeps the asset; it is deliberately not
part of the URI. The native side also verifies at runtime that the raw resource
still carries that name, and rejects the bridge call when the channel set could
not be ensured — registration refuses to continue on that answer.

`AsolNotificationInbox` is application-owned and compiled into
`MainActivity`, so its Capacitor proxy is registered synchronously. It must not
be loaded through the optional dynamic-plugin cache: an early WebView/native
bridge race would otherwise make native inbox import appear unavailable for the rest
of that process. Optional plugin imports retry after a transient loader
rejection instead of caching that rejection permanently.

Android must call `AsolNotificationInbox.getDelivered()` explicitly. Do not
feature-detect this Capacitor proxy with JavaScript's `in` operator: native
methods are not ordinary proxy properties, so the check can incorrectly select
an unimplemented fallback and prevent background or terminated notifications
from reaching the notification centre.

Dismissed notification identities are remembered locally by `id` and
`dedupeKey`. Both the native-inbox import and legacy Android tray import check
that list before saving delivered
notifications, so deleting an item from `/notifications` prevents it from
appearing again when the app resumes. If an Android payload does not provide a
stable id, the adapter derives a stable fallback from the title, body, and route
instead of using the current time.

The web push path mirrors the same center behavior through
`public/asol-push-sw.js`: incoming browser push payloads include the target
`uid`, are stored in the local AsolDB notification list, refresh the local
badge, and notify open app windows so `/notifications` updates immediately.
The service worker also checks the same local dismissed list before storing.

After a fresh interactive login, native builds show an ASOL explanation dialog
when this device is not registered. Restoring an existing session does not show
the dialog. Pressing **Enable notifications** is the explicit user action that
starts the platform flow:

- Android 13 and newer request `POST_NOTIFICATIONS`, then register with FCM only
  after the system returns `granted`.
- Android 12 and older report notification permission as already granted, so
  the same ASOL button registers the device without a nonexistent OS prompt.
- A denied or blocked permission changes the primary action to **Open app
  settings**. Returning with permission granted completes registration.
- **Not now** closes the dialog without registering a token. It never turns a
  refusal into an application error.
- A device already enabled with granted permission is not prompted again.

The prompt listens to the explicit login-completed event, not merely to
`SessionProvider` hydration. It is delayed until the login-success toast has
finished so the two accessible surfaces never overlap.

## Background and Terminated-State Durability

Android tokens receive an FCM **data-only** payload. This guarantees that the
application-owned `AsolPushMessagingService` runs instead of Firebase silently
auto-displaying a top-level `notification` payload. The receiver requires an
owning `uid`, normalizes the complete data map, and performs this sequence:

```text
FCM receipt
  → write the uid-scoped record to the app-private native inbox
  → only after a successful write, post the system notification
  → on startup/resume, import the native inbox into AsolDB IndexedDB
  → refresh the centre and bottom-bar unread badge
  → acknowledge and delete only records IndexedDB accepted
  → process a pending tap and open /notifications
```

The native inbox is an on-device handoff buffer, not notification history and
not cloud storage. It lives under the application's private files directory,
uses AES-256-GCM with an AndroidKeyStore key when available (with a documented
app-private plaintext fallback), retains at most 200 records for at most 14
days, and uses Android `AtomicFile` for interrupted-write recovery. An unreadable
existing inbox fails a new enqueue rather than being overwritten. Notification
bodies and notification-centre history are never stored in Turso or any remote
notification table; IndexedDB remains the permanent centre.

Reads and acknowledgements are scoped to the authenticated uid on both sides of
the native bridge. A record for another account waits for that account and is
never imported into the active user's IndexedDB partition. Signing out removes
the registered token but deliberately keeps uid-owned pending records; account
deletion and explicit local-data clearing erase the native inbox and propagate a
clear failure instead of reporting false success.

The launch Intent carries only a record id, uid, and notification id. The
pointer is synchronously committed to application-private `SharedPreferences`
before the WebView starts, so it survives Activity recreation and full process
death. The actual content remains in the native inbox. A tap is cleared only
after its target exists in IndexedDB and is marked read; if import fails while
the native record still exists, the tap remains pending for the next launch.

Background deliveries are never forwarded into Capacitor's retained
`lastMessage`; the native inbox is their only handoff. This prevents a
dead-process message from replaying as a new foreground delivery and posting a
second banner. Application-owned tray notifications also carry a marker that
the legacy tray sweep skips, preventing a truncated Android tag from creating a
second, metadata-poor notification-centre row.

Normal swipe-away is covered by this path. Android force-stop is different:
the operating system does not deliver FCM until the user manually opens the app,
so nothing can be persisted until delivery resumes. Messages still inside their
FCM TTL may arrive after that reopen.

## Channels

| Channel | Purpose | Importance | Sound | Vibration |
| --- | --- | --- | --- | --- |
| `asol_general_v4` | General and system notifications | 4 | `custom_notification.mp3` | Yes |
| `asol_orders_v4` | Orders, shipping, and returns | 4 | `custom_notification.mp3` | Yes |
| `asol_chat_v4` | Chat and messages | 4 | `custom_notification.mp3` | Yes |
| `asol_urgent_v4` | Critical and urgent notifications | 5 | `custom_notification.mp3` | Yes |
| `asol_updates_v4` | General update notifications | 4 | `custom_notification.mp3` | Yes |
| `asol_silent_v4` | Internal data-only deliveries declared `sound: "silent"` | 2 | none | No |

Channel IDs are versioned because Android does not allow an application to replace the sound configuration of an already-created channel. The v4 generation deliberately replaces all older channel state after the device sound audit, and its user-visible names explicitly identify the custom-tone channels. Users can still override channel behavior from Android system settings.

`AsolNotificationChannels.ensureCreated()` creates the complete channel set in
`MainActivity.onCreate`, at UI startup, before the WebView or an authenticated
session exists, and verifies that the system kept every channel it asked for.
The Java class reads `R.raw.custom_notification` so Android's Release resource
shrinker cannot remove a file that FCM and Capacitor otherwise address only by
its string name, while the channel sound itself is set from the stable
resource-name URI. The JavaScript adapters repeat channel creation idempotently
during initialization and again before token registration, independently of the
current permission state. `LocalNotificationsModule.createChannels()` delegates
to the same bridge: one creator, because whichever call runs first on a device
fixes the sound forever.

Importance is what makes the silent channel silent. Android plays a channel's
sound from importance 3 upward, and a channel created *without* a sound still
inherits the system sound — omitting the file is not enough on its own.

Channel selection lives in
[`src/features/notifications/domain/notification-sound.ts`](../../../src/features/notifications/tests/notification-sound-contract.test.ts)
and is shared by the server FCM provider and the on-device local notification,
so a notification sounds the same whichever displayed it. In order:

1. Sound `silent` → `asol_silent_v4`. It is reserved for invisible data-only signals such as receipts; a low-importance channel is the only way to deliver without a sound.
2. Priority `critical` or sound `urgent` → `asol_urgent_v4`. There is one sound asset, so `urgent` cannot mean a different file; it means the channel that interrupts.
3. Metadata `source = super_admin_broadcast` → `asol_updates_v4`, so a user can silence announcements from Android settings without silencing their orders.
4. Category `orders` → `asol_orders_v4`.
5. Category `chat` → `asol_chat_v4`.
6. Everything else → `asol_general_v4`.

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

The Super Admin can run channel-by-channel local and real FCM checks from
`/dev/notification-tests`. See
[`notification-tests.md`](../../06-super-admin-and-operations/notification-tests.md).
