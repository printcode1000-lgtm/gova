> **Note:** Operational detail relocated here during the 2026-08 architecture reconstruction. Architectural relationships: [docs/01-architecture/](../01-architecture/README.md).

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
# TURSO_PRODUCT_* above points at its own Turso account (hesham103) too.

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

# Server-only: apparel + pets product images (dedicated R2 account; no fallback)
APPAREL_PETS_R2_ACCOUNT_ID=
APPAREL_PETS_R2_API_TOKEN=
APPAREL_PETS_R2_ACCESS_KEY_ID=
APPAREL_PETS_R2_SECRET_ACCESS_KEY=
APPAREL_PETS_R2_BUCKET_NAME=productcat1
APPAREL_PETS_R2_ENDPOINT=https://f08cd5b705c3c57b1f65a220f7ef2642.r2.cloudflarestorage.com
APPAREL_PETS_R2_LOCATION=WEUR
APPAREL_PETS_R2_JURISDICTION=default
APPAREL_PETS_R2_PUBLIC_URL=https://pub-de6cc53c347e4e6fa0dea7b79bd0ce3e.r2.dev
APPAREL_PETS_R2_CATALOG_URI=https://catalog.cloudflarestorage.com/f08cd5b705c3c57b1f65a220f7ef2642/productcat1
APPAREL_PETS_R2_WAREHOUSE_NAME=f08cd5b705c3c57b1f65a220f7ef2642_productcat1
```

```env
# Dedicated OTA release storage (isolated Cloudflare R2 account & bucket)
ASOL_OTA_R2_ACCOUNT_ID=
ASOL_OTA_R2_API_TOKEN=
ASOL_OTA_R2_ACCESS_KEY_ID=
ASOL_OTA_R2_SECRET_ACCESS_KEY=
ASOL_OTA_R2_ENDPOINT=https://21fce63d15897aaa0b68fae1360a1810.r2.cloudflarestorage.com
ASOL_OTA_R2_BUCKET_NAME=ota
ASOL_OTA_R2_LOCATION=WEUR
ASOL_OTA_R2_JURISDICTION=default
ASOL_OTA_R2_PUBLIC_URL=https://pub-ee70bc6c84c54d9b8a8ba44c6f7820a9.r2.dev
ASOL_OTA_R2_CATALOG_URI=https://catalog.cloudflarestorage.com/21fce63d15897aaa0b68fae1360a1810/ota
ASOL_OTA_R2_WAREHOUSE_NAME=21fce63d15897aaa0b68fae1360a1810_ota
ASOL_OTA_R2_PREFIX=app-updates
```

These never fall back to `PRODUCT_R2_*`, `APPAREL_PETS_R2_*`, or `R2_*`. **A fallback across an account boundary is a silent redirect, not a default** — it writes somewhere else instead of failing. Every target requires its own values and throws without them.

`R2_API_TOKEN`, `PRODUCT_R2_API_TOKEN`, `APPAREL_PETS_R2_API_TOKEN`, and `ASOL_OTA_R2_API_TOKEN` are Cloudflare **account** credentials — they create buckets and manage CORS policy. Reading an image needs none of that, so read paths take the S3 pair and the public URL only.
See [R2 Storage Accounts](../05-platform-features/r2-storage-accounts.md).

Sync full browser-upload CORS (GET/PUT/POST/DELETE/HEAD) from `ASOL_CORS_ORIGINS`:

```bash
npm run r2:sync:cors       # General (pic1) and Products (gova-storage)
npm run ota:sync:cors      # Dedicated OTA (ota)
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
```

## Notifications service

Push fan-out runs on a separate Vercel account. The two backends never call each
other: the main app signs a grant, the browser carries it, the service verifies
and delivers. See
[Notification Bridge Module](../05-platform-features/notification-bridge-module.md).

```env
# Client-safe. Where the browser bridge delivers signed grants. Baked into
# static and Capacitor bundles; build-static.ts asserts it is absolute.
NEXT_PUBLIC_ASOL_NOTIFICATIONS_URL=https://asol-notifications.vercel.app
# Server-only. Signs grants on the main app, verifies them on the service.
# Must be byte-identical on both accounts. Falls back to
# ASOL_SESSION_SIGNING_SECRET when unset.
ASOL_NOTIFICATION_GRANT_SECRET=
# Server-only. Native shells unlock Firebase credentials once per device.
# Generate locally: npm run provision:mobile-push
# ASOL_MOBILE_PUSH_UNLOCK_KEY: 32-byte AES key (hex). Main app server only — never NEXT_PUBLIC.
# ASOL_MOBILE_PUSH_CREDENTIAL_BLOB: encrypted Firebase service account (server copy for mismatch checks).
# NEXT_PUBLIC_ASOL_MOBILE_PUSH_CREDENTIAL_BLOB: same ciphertext baked into native/static bundles.
ASOL_MOBILE_PUSH_UNLOCK_KEY=
ASOL_MOBILE_PUSH_CREDENTIAL_BLOB=
NEXT_PUBLIC_ASOL_MOBILE_PUSH_CREDENTIAL_BLOB=
# Vercel API token for the notifications account (deploy script only).
VERCEL_NOTIFICATIONS_TOKEN=
# Vercel API token for the secondary full-application account (deploy script only).
# Account email: groupstenderximages@gmail.com. Token name on Vercel: submain.
VERCEL_SUBMAIN_TOKEN=
# Team scope for submain when the deploy token cannot list teams.
VERCEL_SUBMAIN_ORG_ID=
```

Which deployment gets what:

| Variable | Main app | Notifications service |
|---|---|---|
| `TURSO_NOTIFICATIONS_DATABASE_URL` / `_AUTH_TOKEN` | yes — token CRUD, recipients | yes — resolves tokens to send |
| `ASOL_NOTIFICATION_GRANT_SECRET` | yes — signs grants | yes — verifies them |
| `NEXT_PUBLIC_ASOL_NOTIFICATIONS_URL` | yes — client-safe | **no** — it is the service |
| `ASOL_MOBILE_PUSH_UNLOCK_KEY` | yes — server only, unlock route | **no** |
| `ASOL_MOBILE_PUSH_CREDENTIAL_BLOB` | yes — server mismatch guard | **no** |
| `NEXT_PUBLIC_ASOL_MOBILE_PUSH_CREDENTIAL_BLOB` | yes — baked into static/Capacitor bundles | **no** |
| `FIREBASE_ADMIN_SERVICE_ACCOUNT_BASE64`, `APNS_*`, `WEB_PUSH_VAPID_PRIVATE_KEY` | not needed for web bridge; source for `provision:mobile-push` | yes — web fan-out |
| `TURSO_DATABASE_URL`, product, advertisements, shards | yes | **no** |

The notifications account never receives users, product, or shard credentials.
`sendToUsersLocally` needs only the notifications database, so identity checks
and recipient enrichment stay on the main app.

**Native mobile push credentials** are provisioned on the main app only. Run
`npm run provision:mobile-push` locally (requires `FIREBASE_ADMIN_SERVICE_ACCOUNT_BASE64`
in `.env.local`), then copy the three `ASOL_MOBILE_PUSH_*` / `NEXT_PUBLIC_*` values
to the main app Vercel project. Static builds assert the public blob is present
(`assertStaticMobilePushCredentialBlob` in `packages/ota-core/src/publishing/build/out-runtime-config.ts`).

`ASOL_NOTIFICATION_INTERNAL_SECRET` is gone. It authorised a server-to-server
send that no longer exists, and it doubled as the session signing fallback,
which meant rotating a push credential silently invalidated every signed
session. Set `ASOL_SESSION_SIGNING_SECRET` explicitly instead.

## Products service

Product reads run on a separate Vercel account. The two backends never call each
other: the browser bridge sends reads to the products service and everything
else to the main app. See
[Service Bridge Module](../05-platform-features/service-bridge-module.md).

```env
# Client-safe. Where the browser bridge sends product reads. Baked into static
# and Capacitor bundles; build-static.ts asserts it is absolute.
NEXT_PUBLIC_ASOL_PRODUCTS_URL=https://asol-products.vercel.app
# Turso Platform API for the products account only (provisioning scripts).
TURSO_PRODUCT_API_TOKEN=
TURSO_PRODUCT_ORGANIZATION=hesham103
# Vercel API token for the products account (deploy script only).
VERCEL_PRODUCTS_TOKEN=
```

| Variable | Main app | Products service |
|---|---|---|
| `TURSO_PRODUCT_DATABASE_URL` / `_AUTH_TOKEN` | yes — writes, deletion, data health, profile counts | yes — reads |
| `NEXT_PUBLIC_ASOL_PRODUCTS_URL` | yes — client-safe | **no** — it is the service |
| Users, advertisements, notifications, shard credentials | yes | **no** |

Empty `NEXT_PUBLIC_ASOL_PRODUCTS_URL` is a safe default, not a broken one: every
request then goes to the main app, which still serves those routes.

`LEGACY_PRODUCT_DATABASE_URL` / `_AUTH_TOKEN` exist only for the one-time
migration in `npm run db:migrate:product`. Delete them once the new account is
verified.

## Browser Web Push

| Variable | Where | Notes |
|---|---|---|
| `WEB_PUSH_VAPID_PRIVATE_KEY` | notifications service, server-only | Signs the VAPID JWT. Required by `npm run notifications:deploy`: browsers are the one transport that needs no store account and no native build, so a deployment without it silently loses the channel it always has. |

The public key and the `mailto:` subject are **not** environment variables. They
are constants in `src/features/notifications/domain/web-push-config.ts`, because
every subscribing browser receives the public key anyway — it is
`applicationServerKey`. Keeping it in the bundle also lets a static export and
the native shell subscribe with no server call.

Rotating the pair invalidates every existing `PushSubscription`, so it is
deliberately a code change plus an env change, never an admin action. Change
both halves together.

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

## No fallbacks

Every secret has exactly one source and throws when it is missing. The chains
that used to exist are gone on purpose:

| Variable | It used to fall back to | Why that was removed |
|---|---|---|
| `ASOL_SESSION_SIGNING_SECRET` | the notification secret, then `TURSO_AUTH_TOKEN` | Sessions could be signed with a credential nobody chose, and rotating it logged everyone out for no visible reason |
| `ASOL_NOTIFICATION_GRANT_SECRET` | `ASOL_SESSION_SIGNING_SECRET` | The two accounts could quietly agree on a different key than the configured one; a mismatch surfaced only as forged-grant rejections |

A missing value now fails loudly at the first call rather than producing an
application that looks like it works.

`TURSO_PROFILE_*` and `MARKETPLACE_ORDERS_DATABASE_*` no longer exist. They
pointed at un-sharded databases that no code read; both have been deleted.

## Never expose

`TURSO_API_TOKEN`, `TURSO_AUTH_TOKEN`, `TURSO_NOTIFICATIONS_API_TOKEN`, `TURSO_NOTIFICATIONS_AUTH_TOKEN`, `VERCEL_NOTIFICATIONS_TOKEN`, `VERCEL_SUBMAIN_TOKEN`, `VERCEL_SUB2MAIN_TOKEN`, shard `*_DATABASE_AUTH_TOKEN` values, `R2_API_TOKEN`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `PRODUCT_R2_API_TOKEN`, `PRODUCT_R2_ACCESS_KEY_ID`, `PRODUCT_R2_SECRET_ACCESS_KEY`, `ASOL_SESSION_SIGNING_SECRET`, `ASOL_NOTIFICATION_GRANT_SECRET`, `FIREBASE_ADMIN_SERVICE_ACCOUNT_BASE64`, `FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON`, `FIREBASE_ANDROID_GOOGLE_SERVICES_BASE64`, `APNS_PRIVATE_KEY`, `VERCEL_TOKEN` — not in client bundles, IndexedDB, localStorage, or logs.

## Vercel deploy

Six Vercel accounts; see [26-cloud-accounts.md](../06-super-admin-and-operations/cloud-accounts-architecture.md). The two
full-application deployments share runtime env keys but use different deploy
tokens and update paths.

**Main app (`gova`)** — connected to GitHub and redeployed automatically on every push.
That link must stay as it is. After local provisioning, push users, product,
advertisements, notifications, every shard runtime variable, and native mobile
push credentials (`ASOL_MOBILE_PUSH_*`, `NEXT_PUBLIC_ASOL_MOBILE_PUSH_CREDENTIAL_BLOB`):

```bash
npm run provision:mobile-push   # once, after FIREBASE_ADMIN_SERVICE_ACCOUNT_BASE64 is set locally
npm run db:push:vercel-env
npm run deploy:redeploy-main    # or push to GitHub if you prefer the normal pipeline
```

Then wait for the deployment to finish.

**Secondary full app (`submain`)** — account email `groupstenderximages@gmail.com`,
not connected to GitHub. Deploy token: `VERCEL_SUBMAIN_TOKEN` (deploy script only;
never stored on the Vercel project). When the token cannot list teams, also set
`VERCEL_SUBMAIN_ORG_ID` locally. Syncs the same runtime keys as `gova` without
foreign deploy tokens:

```bash
npm run submain:deploy
```

**Third full app (`sub2main`)** — account email `tenderx.engineer100@gmail.com`,
not connected to GitHub. Deploy token: `VERCEL_SUB2MAIN_TOKEN` (deploy script only;
never stored on the Vercel project). When the token cannot list teams, also set
`VERCEL_SUB2MAIN_ORG_ID` locally. Syncs the same runtime keys as `gova` without
foreign deploy tokens:

```bash
npm run sub2main:deploy
```

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

## GitHub repository administration

```env
GITHUB_ADMIN_TOKEN=
GITHUB_REPOSITORY=printcode1000-lgtm/gova
```

Server-only, and `.env.local` only — never `.env.example`, which is committed.
`GITHUB_REPOSITORY` is optional; the script reads the `origin` remote when it is
unset.

Used by `npm run github:protect` (`scripts/protect-main-branch.ts`) to configure
branch protection on `main`, by `--remove` to take it off — the state the
repository currently runs in, see
[22. Scripts & Workflows](./22-scripts-and-workflows.md#branch-protection) — and by
`npm run github:block-branches` to apply the `main-only` ruleset that makes `main`
the only branch that can exist. This is rule 6 of
[the module isolation rules](../01-architecture/02-packages/module-isolation-rules.md) — the one
rule that cannot be satisfied from the repository tree, because the enforcement
lives in GitHub's settings rather than in a file.

### What the current token can do

The token in use is described by its owner as a **full repository management
token for the Gova project**, covering code and branch management, repository
settings and branch protection, pull requests and merges, GitHub Actions and
workflows, deployments, secrets and variables, security features, webhooks,
releases, and related administrative operations.

Read that as written: **it can change anything in this repository**, including
the branch protection it is used to apply, the Actions workflows that gate
merges, and the repository's own secrets. It is scoped to `printcode1000-lgtm/gova`
alone and carries no user permissions, so its blast radius stops at this
repository — but inside this repository there is nothing it cannot do.

### What is actually required

`scripts/protect-main-branch.ts` calls exactly one endpoint,
`PUT /repos/{repo}/branches/main/protection`. That needs **`Administration:
Read and write`** and nothing else; `Contents: Read-only` is enough for
everything else the script reads.

A replacement should be a fine-grained token limited to this repository with
those two permissions and a real expiry date. Every additional permission is
capability the project never exercises and would lose if the token leaked.

There is also a structural reason to keep it narrow. Rule 6 exists to make
`packages/**` hard to change without review. A token that can rewrite branch
protection, workflows, and secrets, sitting in the same working tree as the code
it guards, can undo that in one call — the lock does not protect much when the
key is kept beside it.

### Where it is stored, and where it spreads

`.env.local` is git-ignored (`.gitignore` line 78), so the value never enters a
commit. Note that `npm run secrets:backup` collects git-ignored secret files into
its encrypted archive, so the token is copied into every backup taken after it is
added. A long-lived token therefore accumulates copies; a short-lived one does
not.

Create replacements at
`github.com/settings/personal-access-tokens/new` → *Only select repositories* →
`gova`.
