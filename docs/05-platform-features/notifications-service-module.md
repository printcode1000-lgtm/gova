# Notifications Service Module

An independent deployment that does one thing: fan out push notifications.
It lives in `services/notifications/`, runs on its own Vercel account, and reads
its own Turso database.

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
├── next.config.ts        # turbopack root + better-sqlite3 alias
├── tsconfig.json         # "@/*" resolves to ./generated/src/*
├── .vercelignore         # forces generated/ into the upload
├── stubs/
│   └── better-sqlite3.js
├── src/app/
│   ├── layout.tsx
│   └── api/
│       ├── notifications/send/route.ts   # the only fan-out route in the system
│       └── health/route.ts
└── generated/            # mirrored from src/, git-ignored, rebuilt per deploy
```

## Routes

| Route | Purpose |
|---|---|
| `POST /api/notifications/send` | Fan-out. Body is `{ grants: [...] }`; each grant is signature-verified and expiry-checked. No bearer token, no cookies. |
| `GET /api/health` | Reports whether each credential is *present*, never its value. Safe to call publicly, and makes a misconfigured deployment visible without sending a real push. |

Everything else stays on the main app. Device-token registration and broadcast
recipient listing both need the users database for identity checks and masked
contact details, so moving them would have forced the notifications account to
hold users credentials — the opposite of the point.

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
`scripts/sync-notifications-service-sources.ts` walks the real import graph from
the route's entry points and mirrors exactly the files it reaches.

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
npx tsx scripts/sync-notifications-service-sources.ts
```

## The `better-sqlite3` stub

The shared data-access code keeps a local-SQLite branch for main-app
development. This deployment always runs against Turso, so
`getServerDatabaseBackend()` can never return `sqlite` here and the driver is
unreachable. Bundling the real native module would force a native build for code
that cannot run.

The stub throws when constructed rather than returning a fake database, so a
routing mistake surfaces immediately instead of silently reading an empty file.

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
| Users, product, advertisements, shard credentials | ✅ | ✖ |

The grant secret must be byte-identical on both sides — the main app signs with
it and the service verifies. `npm run db:push:vercel-env` and
`npm run notifications:deploy` both read it from the same `.env`, so they cannot
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

## Boundaries that are not accidents

| Rule | Why |
|---|---|
| The service never receives users, product, or shard credentials | It resolves no identities; the main app sends it a uid list that is already authorised. |
| The service holds the Firebase and APNs credentials, the main app does not | Fan-out is the only thing that needs them. |
| `services/` is excluded from the root `tsconfig.json` | The mirror resolves `drizzle-orm` from the service's own `node_modules`; type identity would clash if both graphs were checked together. |
| `architecture:check` does not scan `services/` | It enforces the main app's layering. The service's boundary is enforced by its own contract test instead. |
