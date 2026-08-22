# Notification Bridge Module

The connector between the two backend deployments. It is implemented in
`@asol/account-bridge` (door `./notifications`), ships in the browser bundle, and runs nowhere
else.

The one-line re-export the application used to import it through
(`src/modules/notification-bridge/`) is gone, along with its sibling for the service bridge. Its
test moved into the package it tests. Import `@asol/account-bridge/notifications` directly.

## Why it exists

The main app and the notifications service are deployed to two different Vercel
accounts, and neither may call each other. Something still has to connect them.
That something is the client.

```text
                     client (this module)
                     ╱                    ╲
        main app ───╱                      ╲─── notifications service
   issues signed grants                     verifies and delivers (web only)
```

The main app knows *who* should be notified — it holds the users and orders
databases. The notifications service knows *how* to deliver on **web** — it
holds the Firebase and APNs credentials for the browser hop. On **native**
installed shells the device delivers push directly; the main app still authorises
recipients through signed grants and short-lived unlock of encrypted credentials.

## What it does

### Web

1. Every Business API response passes through `AsolApiClient.parseResponse`,
   which calls `scheduleNotificationGrantDelivery(body)`.
2. If the body carries a `notificationGrants` array, the bridge POSTs those
   grants to `NEXT_PUBLIC_ASOL_NOTIFICATIONS_URL/api/notifications/send`.
3. If it does not — which is almost every response — the call is a no-op.

### Native (Capacitor)

On Android and iOS the bridge **does not** call the notifications service. The
installed shell delivers push directly:

1. `SessionProvider` registers the signed-in `uid`/`phone` in
   `notification-grant-delivery-context.ts` so the bridge knows who is carrying
   grants.
2. On Android, `deliverNotificationGrantsFromNative` calls
   `NativeCore.ensureNotificationChannels()` before any send so every payload
   targets a channel that already exists natively.
3. For each grant batch the bridge calls
   `POST /api/notifications/recipient-tokens` on the **main app**. The server
   verifies every grant signature, checks `actorUid` against the caller, and
   returns FCM registration tokens for the recipients (push-enabled accounts
   only).
4. The device builds notification text from `@asol/notifications-core/builder`
   templates — the same vocabulary the notifications service uses — resolves
   the Android channel with `resolveAndroidChannelId` (identical to the server
   FCM provider and to `AsolNotificationChannels.resolveChannelId` in Java),
   and sends through FCM HTTP v1 with credentials unlocked once via
   `POST /api/notifications/mobile-push/unlock`.

Credential handling:

| Stage | What is stored | Where |
|---|---|---|
| App bundle | AES-256-GCM blob of the Firebase service account | `NEXT_PUBLIC_ASOL_MOBILE_PUSH_CREDENTIAL_BLOB` (client-safe ciphertext only) |
| Unlock | Server decrypts after `uid`/`phone` identity check | `ASOL_MOBILE_PUSH_UNLOCK_KEY` (server only, never in bundles) |
| After unlock | Re-encrypted credential bundle | Capacitor Preferences under a device-local AES-GCM key |

The web path is unchanged. Native delivery is an additional branch inside
`deliverNotificationGrants`; it never removes or replaces the notifications
service hop on web.

```text
Web:     main app ──grant──► browser ──grant──► notifications service ──► FCM/APNs/WebPush
Native:  main app ──grant──► device ──tokens──► main app
                              └── FCM HTTP v1 (credentials unlocked once)
```

Hooking the transport rather than each caller means no route or component has to
remember to forward anything. Adding a grant to a response is enough.

## Main-app APIs (native only)

| Route | Purpose |
|---|---|
| `POST /api/notifications/recipient-tokens` | Verify grants; return recipient FCM tokens and the verified send payload |
| `POST /api/notifications/mobile-push/unlock` | Verify identity; decrypt the embedded blob; return the Firebase service-account bundle once per device enrollment |

The notifications service does **not** expose these routes.

## Provisioning credentials

From a machine that has `FIREBASE_ADMIN_SERVICE_ACCOUNT_BASE64` in `.env.local`:

```bash
npm run provision:mobile-push
```

This script (`scripts/provision-mobile-push-credentials.ts`):

1. Reads the Firebase service-account JSON from `FIREBASE_ADMIN_SERVICE_ACCOUNT_BASE64`.
2. Generates or preserves `ASOL_MOBILE_PUSH_UNLOCK_KEY` (32-byte hex).
3. Encrypts `{ projectId, clientEmail, privateKey }` into an AES-256-GCM blob.
4. Writes `ASOL_MOBILE_PUSH_UNLOCK_KEY`, `ASOL_MOBILE_PUSH_CREDENTIAL_BLOB`, and
   `NEXT_PUBLIC_ASOL_MOBILE_PUSH_CREDENTIAL_BLOB` into `.env.local`.

Set the same three values on the **main app** Vercel project. The unlock key must
never appear in `NEXT_PUBLIC_*` or in static/Capacitor bundles.

For a one-off blob from a JSON file:

```bash
npx tsx scripts/encrypt-mobile-push-credential-blob.ts <unlock-key-hex-64> path/to/service-account.json
```

## Rules it follows

**Background by default.** Ordinary business APIs hand the response to the
caller before delivery is attempted. A push that fails to leave the browser must
never turn a successful order into a failed one, so that default path never
rejects and never blocks. Features whose visible outcome is the notification
itself may opt into manual delivery and inspect the recipient results.

**No session on the web hop.** The web bridge sends `credentials: "omit"` and no
bearer token. The grant is the only authority for the notifications service.

**Browser only for scheduling.** Every entry point returns early when `window`
is undefined, so importing it during SSR or a static export is harmless.

**Grants are opaque on web.** The web path reads a signed string and posts it
unchanged. Native delivery additionally parses the verified send payload returned
by `recipient-tokens`; it cannot forge grants because it does not hold
`ASOL_NOTIFICATION_GRANT_SECRET`.

### Local development (`next dev`)

Production web posts grants to the notifications service, which resolves device
tokens from Turso. A `next dev` browser registers tokens into local
`notifications.db` instead, so pointing the bridge at the remote service would
always report `no_tokens`.

When `NEXT_PUBLIC_ASOL_NOTIFICATIONS_URL` is unset and `NODE_ENV` is
`development`, `getNotificationsPublicUrl()` returns the page origin
(`http://localhost:3001` by default). The bridge then posts to
`/api/notifications/send` on the main app. That route exists only in
development builds: it answers `404` in production and calls
`deliverNotificationGrants` from `@asol/notifications-core/server`, the same
entry point the notifications service uses.

Web Push from localhost still needs `WEB_PUSH_VAPID_PRIVATE_KEY` in
`.env.local` (or Cloud Agent Secrets) so the Web Push provider can sign
outbound messages. Grant signing needs `ASOL_NOTIFICATION_GRANT_SECRET`, or
`ASOL_SESSION_SIGNING_SECRET` when the dedicated grant secret is unset.

#### Preflight

```bash
npm run notifications:check:local
```

`scripts/check-localhost-notifications.ts` reports whether
`http://localhost:3001` will behave like the deployed site, because every way
that parity breaks is a configuration value and each one fails quietly:

| Wrong value | What actually happens |
|---|---|
| No grant secret | `NotificationGrantCollector.issue` swallows the throw and yields zero grants. The order succeeds and nothing is ever sent. |
| No `WEB_PUSH_VAPID_PRIVATE_KEY` | The provider answers `webPushNotConfigured` inside a delivery result nobody reads. |
| `NEXT_PUBLIC_ASOL_NOTIFICATIONS_URL` set | Grants go to the deployed service, which resolves tokens from Turso and can only answer `no_tokens` for a device registered on localhost. |

It also checks `notifications.db` and `public/asol-push-sw.js`, and — when a dev
server is answering — signs a real grant for a uid that owns no device and posts
it to `/api/notifications/send`. A `200` carrying `no_tokens` proves the
signature verified and the local database was read, without pushing to anyone.
It exits non-zero on the first blocker. `ASOL_LOCAL_ORIGIN` overrides the port.

Nothing else differs. The browser subscribes with the same VAPID public key,
registers through the same Business API, and carries the same signed grant to
the same `deliverNotificationGrants`. Only the token store changes: local
SQLite instead of Turso, so a device registered on the deployed site is not
reachable from localhost and the reverse is equally true.

| Variable | Where | Notes |
|---|---|---|
| `NEXT_PUBLIC_ASOL_NOTIFICATIONS_URL` | main app, client-safe | Origin of the notifications service on production web and static builds. When unset in `next dev`, the bridge falls back to `window.location.origin` and posts to the main app's development-only `/api/notifications/send`, which fans out against local SQLite. Set explicitly to override (for example to exercise the deployed service from localhost). |
| `ASOL_MOBILE_PUSH_UNLOCK_KEY` | main app server only | 32-byte AES key (hex or base64). Decrypts the embedded blob at unlock. **Never** baked into client bundles. |
| `ASOL_MOBILE_PUSH_CREDENTIAL_BLOB` | main app server | Same ciphertext as the public blob; optional mismatch guard on unlock. |
| `NEXT_PUBLIC_ASOL_MOBILE_PUSH_CREDENTIAL_BLOB` | main app, client-safe | AES-256-GCM blob baked into static/Capacitor bundles. Useless without the unlock key. |

A static export or native shell has no same-origin fallback. `packages/ota-core`
`build-out.ts` calls `assertStaticMobilePushCredentialBlob()` before the Next
build and `auditStaticMobilePushSecurity()` on `out/` — the blob must be present
and the bundle must not contain a private key or the unlock key. The audit matches
**plaintext** PEM bodies and env names, not PEM header strings used by `fcm-auth.ts`
for parsing; see
[static-mobile-push-pem-audit-false-positive.md](../../08-troubleshooting/problems/static-mobile-push-pem-audit-false-positive.md).

## Android channel compatibility

Every outbound native FCM message carries `androidChannelId` in the data map,
computed by `resolveAndroidChannelId` in `@asol/notifications-core`. The same
rule runs in:

- the notifications-service FCM provider (web path),
- `packages/account-bridge/src/mobile-push/fcm-message.ts` (native send path),
- `AsolNotificationChannels.resolveChannelId` (native receive/display path).

Channels themselves are created only in native code — `AsolNotificationChannels.ensureCreated`
at activity startup and through `NativeCore.ensureNotificationChannels()` during
push initialization. Capacitor's `PushNotifications.createChannel` is **not**
used.

`notification-channel-parity.test.ts` and `notification-sound-contract.test.ts`
fail the build if any of the three implementations drift.

## The cost this design accepts

Delivery is **best effort**. The client must still be alive to carry the grant.
A seller who accepts an order and closes the app immediately may leave the buyer
unnotified, and there is no server-side retry from the main app.

Specialty-chat request, reply, and receipt actions, plus super-admin broadcasts,
are the deliberate exceptions to the fire-and-forget UI contract on **web**: they
await the bridge hop and inspect per-recipient results. On native, the same
features still issue grants; delivery runs through the native branch above.

Because of it, API responses report what was **granted**, not what was
delivered: `grantedUsers` and `status: "granted"`. Provider acceptance is not
knowable on the main app.

## Enforcement

| Suite | What it proves |
|---|---|
| `notifications-service-module-contract.test.ts` | Main-app dev send route is gated; notifications service stays self-contained |
| `packages/account-bridge/src/tests/mobile-push.test.ts` | No server secrets in the channel graph; local credential encryption round-trip |
| `mobile-push-unlock.service.test.ts` | Server unlock verifies identity and blob |
| `mobile-push-contract.test.ts` | APIs and native branch wired |
| `notification-channel-parity.test.ts` | Channel resolution matches Java across all templates and test scenarios |
| `notification-sound-contract.test.ts` | Channel ids, assets, and native bootstrap agree |

`architecture-check.ts` allows `fetch` in exactly two files — the client HTTP
transport and this bridge — so no other module can open a second path between
the deployments on web.

## Files

```text
packages/account-bridge/
├── src/notifications.ts              # deliverNotificationGrants, schedule*, enrollment exports
└── src/mobile-push/
    ├── deliver.ts                    # native grant fan-out
    ├── enrollment.ts                 # unlock + credential cache
    ├── embedded-blob.ts              # reads NEXT_PUBLIC blob
    ├── credential-store-crypto.ts    # device-local AES-GCM
    ├── fcm-auth.ts                   # Web Crypto JWT → FCM access token
    ├── fcm-message.ts                # FCM HTTP v1 payload (channels + data map)
    └── provider-payload.ts             # NotificationBuilder for templates

@asol/account-bridge/notifications/      # re-exports @asol/account-bridge/notifications
src/app/api/notifications/
├── recipient-tokens/route.ts
└── mobile-push/unlock/route.ts
src/features/notifications/domain/
├── notification-grant-envelope.ts
└── notification-grant-delivery-context.ts
```

See also [Notification System](notification-system.md) and
[Notifications Service Module](notifications-service-module.md).
