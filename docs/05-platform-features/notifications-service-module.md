# Notifications Service Module

An independent deployment that owns the whole `/api/notifications/**` surface:
push fan-out, device registration, the account's device list, the push mute
switch, the self and broadcast tests, broadcast recipients and sends, and the
native sender's recipient tokens and credential unlock. It lives in
`services/notifications/`, runs on its own Vercel account, and reads its own
Turso database plus the users database.

The rest of the notification system — the local-first center, templates, badges,
device-token registration — is documented in
[`notification-system.md`](notification-system.md). This file covers only the
separately deployed module.

## Why it exists

Fan-out is one provider request per device token, up to 25 in flight. On a
serverless platform billed by wall clock, that burst is the expensive part of a
notification, not the route that triggered it. Before the split, accepting an
order held a function open until the last push had been delivered.

Moving fan-out to its own account means the main app pays for one HTTP round
trip, and the burst is billed where it belongs. It also means a push storm can
never consume the quota that serves logins, product pages, or orders.

## What is deployed

Only `services/notifications/` is uploaded. Nothing else in the repository
leaves the machine.

```text
services/notifications/
├── package.json          # its own dependencies, installed remotely
├── package-lock.json
├── next.config.ts        # turbopack root + embedded local database driver alias
├── tsconfig.json         # "@/*" resolves to ./generated/src/*
├── .vercelignore         # forces generated/ into the upload
├── stubs/
│   └── embedded local database driver.js
├── src/app/
│   ├── layout.tsx
│   └── api/
│       ├── notifications/send/route.ts   # the only fan-out route in the system
│       ├── notifications/**/route.ts     # the session-bound account surface
│       └── health/route.ts
├── src/app/lib/http.ts   # CORS + status mapping for the session-bound routes
└── generated/            # mirrored from src/, git-ignored, rebuilt per deploy
```

## Routes

| Route | Purpose |
|---|---|
| `POST /api/notifications/send` | Fan-out. Body is `{ grants: [...] }`; each grant is signature-verified and expiry-checked. No bearer token, no cookies. |
| `GET /api/health` | Reports whether each credential is *present*, never its value. Safe to call publicly, and makes a misconfigured deployment visible without sending a real push. |

| `POST`/`DELETE /api/notifications/device-token` | Register or revoke this device's token; the caller must own it. |
| `GET`/`DELETE /api/notifications/devices` | The signed account's registrations; revoke one. |
| `GET`/`POST /api/notifications/preferences` | The account-wide push mute switch. |
| `POST /api/notifications/test/self` | The signed account's own delivery test (grant issued here). |
| `POST /api/notifications/test/send` | The Super Admin broadcast test. |
| `GET /api/notifications/broadcast/recipients`, `POST /api/notifications/broadcast/send` | Super Admin broadcast. |
| `POST /api/notifications/recipient-tokens` | Native sender: verify the session and grants, return `fcm` tokens. |
| `POST /api/notifications/mobile-push/unlock` | Native sender: decrypt the embedded Admin blob for a signed session. |

The session-bound routes reach the application's services through
`@asol/notifications-composition` (`account`, `devices`), whose only application
notification import is the exact seam
`notification-service.bootstrap.server`. They used to live on `asol-submain`
because they need the users database and the session signing secret; they were
consolidated here by an explicit decision to widen this account's credentials
so that one account owns the whole notification surface.

## How the main app reaches it

**It does not.** That is the point of the design.

```text
order route / specialty chat / broadcast
  └─► NotificationGrantCollector.issue(...)   signs, returns in the response
                                              │
                          browser bridge ◄────┘
                                │
                                └─► POST <service>/api/notifications/send
                                        └─► sendToUsersLocally, here
```

The main app has no URL for this service, no client for it, and no code path to
it. It signs a decision; the user's browser carries it. See
[Notification Bridge Module](notification-bridge-module.md).

**Native installed shells** do not use fan-out. Capacitor devices call this
service's session-bound routes with their signed session for grant verification (`POST /api/notifications/recipient-tokens`
on every send) and, when Preferences are empty,
`POST /api/notifications/mobile-push/unlock`, then send FCM HTTP v1 from the
device to Google. The service remains the only **web** fan-out path.

Three rules keep the boundary honest, all enforced by
`notifications-service-module-contract.test.ts`:

- **The main app serves no fan-out route.** `src/app/api/notifications/send`
  does not exist. Fan-out has exactly one HTTP entry point, on the service.
- **The service route calls `sendToUsersLocally`.** Nothing in this deployment
  forwards anywhere.
- **Nothing under `services/notifications` imports outside its own folder.**
  Only that folder is uploaded, so such an import would compile locally and fail
  on the remote build.

## The `generated/` mirror

The service cannot import from `../../src`: only its own folder is uploaded.
Rather than maintain a second copy of the send logic by hand,
`scripts/sync-service-sources.ts notifications` walks the real import graph from
one entry point and mirrors exactly the files it reaches.

**That entry point is `packages/notifications-core/src/service-runtime.ts`, and it is
the only notification path the fan-out route may import.** That route reaches it
and nothing else; `architecture:check` and the module boundary test both reject any
other notification import in `services/notifications`.

The restriction is not stylistic. Because the mirror is built by walking imports,
the service's import surface *is* its file surface: a route that reached
`@/features/notifications/server` would pull the broadcast service, the token
service, and the users repository onto an account that must never hold them —
silently, and only visible as a larger `generated/` tree. `service-runtime.ts`
exports two things, verify a grant and deliver a grant, so there is no path from
it to the users data.

It follows `require("...")` as well as `import`, which matters:
`data-source-registry.ts` picks its database client through a lazy `require`, so
an import-only walker would produce a registry with all its branches missing.

The output is regenerated on every deploy and verified by the contract test,
which mirrors into a throwaway directory and compares fingerprints. A check that
repaired the drift it was looking for would only ever fail once.

This mirrors the existing `data-access:sync-public` pattern for
`public/asol-push-sw.js`.

If the test reports a stale mirror:

```bash
npx tsx scripts/sync-service-sources.ts notifications
```

## The `embedded local database driver` stub

The shared data-access code keeps a local-local database branch for main-app
development. This deployment always runs against Turso, so the driver is
unreachable here, and bundling the real native module would force a native build
for code that cannot run.

The stub throws when constructed rather than returning a fake database, so a
routing mistake surfaces immediately instead of silently reading an empty file.

### The stub is not the guarantee — the composition root is

This section used to claim `getServerDatabaseBackend()` could never return
`local database` here. That was false, and the service smoke gate proved it: the backend
is resolved from the runtime context, and a data source of `local` selects
local database in any deployment that asks. During a real `deploy:all` the profiles
account did exactly that, loaded a driver it does not ship, and answered 500 on
every route reaching data — with a stub message naming a different account.

Every composition root pinned the backend after that, which fixed the symptom.
The choice itself is gone now — server application data is Turso in every
runtime, so the registrar takes no options and there is no stub to alias:

```ts
registerDataCoreRuntimeConfigPorts();
```

`npm run architecture:check` fails on any `embedded local database driver` reference outside an
isolated test, so no configuration value can reach a driver this account does not
ship. See `docs/08-troubleshooting/problems/every-server-route-500-unregistered-port.md`.

## Deploying

```bash
npm run notifications:deploy
```

The command creates the project on first run, syncs its environment variables,
mirrors the shared sources, then uploads the folder and builds remotely. Because
this build runs no schema sync and prerenders no pages, it needs no database.

The project is **not connected to GitHub**. A push to the repository redeploys
the main app and changes nothing here.

## Environment

| Variable | Main app | Service |
|---|:---:|:---:|
| `TURSO_NOTIFICATIONS_DATABASE_URL` / `_AUTH_TOKEN` | ✅ token CRUD, recipients | ✅ resolves tokens to send |
| `ASOL_NOTIFICATION_GRANT_SECRET` | ✅ signs grants | ✅ verifies them |
| `NEXT_PUBLIC_ASOL_NOTIFICATIONS_URL` | ✅ client-safe, tells the browser where to deliver | ✖ it *is* the service |
| `FIREBASE_ADMIN_SERVICE_ACCOUNT_BASE64`, `APNS_*` | ✖ | ✅ |
| `WEB_PUSH_VAPID_PRIVATE_KEY` | ✖ | ✅ required — the public half is a constant in the bundle |
| `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` (users) | ✅ | ✅ identity checks, broadcast recipients |
| `ASOL_SESSION_SIGNING_SECRET` | ✅ | ✅ verifies the signed session |
| `ASOL_MOBILE_PUSH_UNLOCK_KEY`, `ASOL_MOBILE_PUSH_CREDENTIAL_BLOB` | ✅ | ✅ native unlock (optional; unset → `503 mobilePushUnlockNotConfigured`) |
| Product, advertisements, shard credentials | ✅ | ✖ |

The grant secret must be byte-identical on both sides — the main app signs with
it and the service verifies. `npm run db:push:vercel-env` and
`npm run notifications:deploy` both read it from the same `.env.local`, so they cannot
drift. If they ever do, every grant is rejected as forged.

The service is never told where the main app is: it has no reason to call it,
and a grant already carries everything a send needs.

## Verifying a deployment

```bash
curl https://asol-notifications.vercel.app/api/health
```

An end-to-end probe needs a real grant, because a grant is the only way in. Sign
one with the same secret the service holds, then post it:

```bash
npx tsx scripts/probe-notifications-service.ts
```

A grant for a user with no registered device comes back `no_tokens`, which
proves the whole chain — signature, database connection, token resolution —
without delivering anything. An unsigned or tampered body is rejected with
`notificationGrantInvalid`, which is the security property worth re-checking
after any change to the grant format.

The whole surface is probed by a manual, outward-facing smoke that is **not**
part of `npm test`:

```bash
npm run smoke:notifications
npm run smoke:notifications -- --origin https://asol-notifications.vercel.app --api-base https://gova-swart.vercel.app
```

It sends only unauthenticated, side-effect-free requests. It fails when health
reports a required credential missing (`notificationsDatabase`, `grantSecret`,
`webPush`, `usersDatabase`, `sessionSecret`), when any route answers a `404`
without a JSON error (a missing route file), a `5xx`, or a `2xx` to an
unauthenticated call, when a preflight does not allow `x-asol-session-token`,
and when the compatibility boundary redirects a notification call anywhere but
this origin. `firebase`, `apns` and `mobilePushUnlock` are reported as warnings.

Broadcast and the Super Admin test fail closed until a composition root names
the administrator. `@asol/notifications-composition` does so at startup
(`configureNotificationAdminAuthorization`); without it every `broadcast/*`
request answers `forbidden` whatever the session.

## Boundaries that are not accidents

| Rule | Why |
|---|---|
| The service never receives product or shard credentials | Fan-out resolves no identities from them. The users database and session secret are held only for the session-bound account surface. |
| The service holds the Firebase and APNs credentials, the main app does not | Fan-out is the only thing that needs them. |
| `architecture:check` does not scan `services/` | It enforces the main app's layering. The service's boundary is enforced by its own contract test instead. |
