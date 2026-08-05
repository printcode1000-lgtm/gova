# Environment Variables

```env
# ── ASOL API (client-safe) ──
NEXT_PUBLIC_ASOL_API_BASE_URL=     # Remote backend (static/Capacitor). Empty = same origin.
NEXT_PUBLIC_ASOL_BASE_PATH=        # Asset base path (GitHub Pages sub-path)

# ── Turso runtime (server-only) ──
TURSO_DATABASE_URL=                # users DB (allusers.db)
TURSO_AUTH_TOKEN=
TURSO_PRODUCT_DATABASE_URL=        # product DB
TURSO_PRODUCT_AUTH_TOKEN=
TURSO_ADVERTISEMENTS_DATABASE_URL= # advertisements DB
TURSO_ADVERTISEMENTS_AUTH_TOKEN=
PROFILE_CORE_DATABASE_URL=         # shard example
PROFILE_CORE_DATABASE_AUTH_TOKEN=
ORDERS_CORE_DATABASE_URL=          # shard example
ORDERS_CORE_DATABASE_AUTH_TOKEN=

TURSO_NOTIFICATIONS_DATABASE_URL= # notifications DB — separate Turso account
TURSO_NOTIFICATIONS_AUTH_TOKEN=

# ── Turso provisioning (build/deploy scripts only) ──
TURSO_API_TOKEN=
TURSO_ORGANIZATION=
TURSO_NOTIFICATIONS_API_TOKEN=     # notifications account only
TURSO_NOTIFICATIONS_ORGANIZATION=

# ── Server CORS ──
ASOL_CORS_ORIGINS=
ASOL_SESSION_SIGNING_SECRET=        # Server-only, at least 32 random characters

# ── App mode ──
ASOL_MODE=development              # development | production | static

# ── Capacitor (platform layer) ──
CAPACITOR_SERVER_URL=
ASOL_CAPACITOR_API_BASE_URL=
```

## Cloudflare R2

```env
# Server-only: general images, excluding products
R2_ACCOUNT_ID=
R2_API_TOKEN=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=pic1
R2_ENDPOINT=https://8486fdbb1c87dc78481f2def0a23e043.r2.cloudflarestorage.com
R2_LOCATION=WEUR
R2_PUBLIC_URL=https://pub-91c79e3f34ed4575b997fd68ac8dd278.r2.dev
R2_CATALOG_URI=https://catalog.cloudflarestorage.com/8486fdbb1c87dc78481f2def0a23e043/pic1
R2_WAREHOUSE_NAME=8486fdbb1c87dc78481f2def0a23e043_pic1

# Client-safe
NEXT_PUBLIC_R2_PUBLIC_URL=https://pub-91c79e3f34ed4575b997fd68ac8dd278.r2.dev

# Server-only: product images stay on the legacy product R2 bucket
PRODUCT_R2_ACCOUNT_ID=
PRODUCT_R2_API_TOKEN=
PRODUCT_R2_ACCESS_KEY_ID=
PRODUCT_R2_SECRET_ACCESS_KEY=
PRODUCT_R2_BUCKET_NAME=gova-storage
PRODUCT_R2_ENDPOINT=https://166409f3b449d8f1da0dee6d25ed3e08.r2.cloudflarestorage.com
PRODUCT_R2_LOCATION=WEUR
PRODUCT_R2_JURISDICTION=default
PRODUCT_R2_PUBLIC_URL=https://pub-e1fa9cec1a694b118840c7c2ebc1633b.r2.dev
PRODUCT_R2_CATALOG_URI=https://catalog.cloudflarestorage.com/166409f3b449d8f1da0dee6d25ed3e08/gova-storage
PRODUCT_R2_WAREHOUSE_NAME=166409f3b449d8f1da0dee6d25ed3e08_gova-storage
```

Sync full browser-upload CORS (GET/PUT/POST/DELETE/HEAD) from `ASOL_CORS_ORIGINS`:

```bash
npm run r2:sync:cors
```

Migrate old public image URLs to the active R2 bucket:

```bash
npm run r2:migrate:images
```

## Push notifications

Firebase Cloud Messaging is the delivery transport for Android, and for Apple
once the Firebase Messaging iOS SDK is installed.

```env
# Server-only. Lossless base64 of the complete Firebase service-account JSON.
# The decoded project_id must be asole-73f1f or the server refuses it.
FIREBASE_ADMIN_SERVICE_ACCOUNT_BASE64=
# Optional inline alternative to the base64 form, same JSON document.
FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON=
# Server-only. Lossless base64 of android/app/google-services.json,
# regenerated into the native project during a Capacitor build.
FIREBASE_ANDROID_GOOGLE_SERVICES_BASE64=
# Server-only bearer secret for POST /api/notifications/send. Minimum 32 chars.
# Also the fallback signing secret when ASOL_SESSION_SIGNING_SECRET is unset.
# Must be identical on the main app and the notifications deployment.
ASOL_NOTIFICATION_INTERNAL_SECRET=
```

## Notifications service

Push fan-out runs on a separate Vercel account. `ASOL_NOTIFICATIONS_SERVICE_URL`
is what switches it on, and it is set **on the main app only**.

```env
# Origin of the notifications deployment, e.g. https://asol-notifications.vercel.app
# Empty means fan-out runs in-process, which is correct for local development
# and for the notifications deployment itself.
ASOL_NOTIFICATIONS_SERVICE_URL=
# Vercel API token for the notifications account (deploy script only).
VERCEL_NOTIFICATIONS_TOKEN=
```

Which deployment gets what:

| Variable | Main app | Notifications service |
|---|---|---|
| `TURSO_NOTIFICATIONS_DATABASE_URL` / `_AUTH_TOKEN` | yes — token CRUD, VAPID, recipients | yes — resolves tokens to send |
| `ASOL_NOTIFICATION_INTERNAL_SECRET` | yes — signs the forwarded call | yes — verifies it |
| `ASOL_NOTIFICATIONS_SERVICE_URL` | yes | **no** — it is the service |
| `FIREBASE_ADMIN_SERVICE_ACCOUNT_BASE64`, `APNS_*` | not needed | yes |
| `TURSO_DATABASE_URL`, product, advertisements, shards | yes | **no** |

The notifications account never receives users, product, or shard credentials.
`NotificationSendService.sendToUsersLocally` needs only the notifications
database, so identity checks and recipient enrichment stay on the main app.

Browser Web Push does not use environment variables. Its VAPID key pair is
generated from `/super-admin/vapid` and stored in the users database table
`notification_vapid_settings`; only the public key ever reaches a browser.

## Apple Push Notification service

Optional. Only used for Apple devices that registered a raw APNs token, which
happens while the Firebase Messaging iOS SDK is absent from the Xcode project.
Leaving these unset is the supported default and produces an explicit
`appleTokenNotDeliverable` result instead of a silent failure.

```env
# Server-only. Encode PEM line breaks as \\n in hosted environment values.
APNS_TEAM_ID=
APNS_KEY_ID=
APNS_BUNDLE_ID=hgh.asol.app
APNS_PRIVATE_KEY=
APNS_PRODUCTION=false
```

## Never expose

`TURSO_API_TOKEN`, `TURSO_AUTH_TOKEN`, `TURSO_NOTIFICATIONS_API_TOKEN`, `TURSO_NOTIFICATIONS_AUTH_TOKEN`, `VERCEL_NOTIFICATIONS_TOKEN`, shard `*_DATABASE_AUTH_TOKEN` values, `R2_API_TOKEN`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `PRODUCT_R2_API_TOKEN`, `PRODUCT_R2_ACCESS_KEY_ID`, `PRODUCT_R2_SECRET_ACCESS_KEY`, `ASOL_SESSION_SIGNING_SECRET`, `ASOL_NOTIFICATION_INTERNAL_SECRET`, `FIREBASE_ADMIN_SERVICE_ACCOUNT_BASE64`, `FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON`, `FIREBASE_ANDROID_GOOGLE_SERVICES_BASE64`, `APNS_PRIVATE_KEY`, `VERCEL_TOKEN` — not in client bundles, IndexedDB, localStorage, or logs.

## Vercel deploy

Two Vercel accounts, deployed two different ways.

**Main app** — connected to GitHub and redeployed automatically on every push.
That link must stay as it is. After local provisioning, push users, product,
advertisements, notifications, plus every shard runtime variable:

```bash
npm run db:push:vercel-env
```

Then redeploy.

**Notifications service** — deliberately **not** connected to GitHub. A push
changes nothing there; it only ever updates when this command runs:

```bash
npm run notifications:deploy
```

The command creates the project on first run, syncs its environment variables,
builds locally, and uploads the prebuilt output. Building locally is what keeps
the users/product/shard credentials off the notifications account: `npm run
build` runs schema sync, and that needs every database. It snapshots and
restores `.vercel/project.json`, so the main app's GitHub link is untouched.

## Moving the backend

Change one client variable:

```env
NEXT_PUBLIC_ASOL_API_BASE_URL=https://api.your-domain.com
```
