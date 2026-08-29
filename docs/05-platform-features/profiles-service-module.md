# Profiles Service Module

An independent deployment that serves profile **reads**. It lives in
`services/profiles/`, runs on its own Vercel account, and reads the seven
profile shards on their own Turso account (`hesham105`).

## What is deployed

Only `services/profiles/` is uploaded. Nothing else in the repository leaves the
machine.

```text
services/profiles/
├── package.json          # its own dependencies, installed remotely
├── next.config.ts        # turbopack root + better-sqlite3 alias
├── tsconfig.json         # "@/*" resolves to ./generated/src/*
├── .vercelignore         # forces generated/ into the upload
├── stubs/better-sqlite3.js
├── src/
│   ├── app/lib/http.ts   # CORS + error mapping, no logging/tracing graph
│   └── app/api/
│       ├── profile/contacts/             GET
│       ├── profile/store-details/        GET
│       ├── profile/specialties/          GET
│       ├── profile/fulfillment-settings/ GET
│       ├── profile/users-by-specialty/   GET
│       └── health/                       GET
├── src/config/           # storage-profiles.json, read at runtime via fs
└── generated/            # mirrored from src/ and public/, git-ignored
```

## The seven shards

```text
profile-core · profile-contact · profile-media · profile-social
profile-catalog · profile-promotions · profile-fulfillment
```

17 tables. **`system-ops` did not move.** Despite living in the same shard family
— it is split out of the same `profile.db` source — it holds `system_logs` and
the `data_health_*` tables, which are not profile data. It stays on `hesham101`.

## Which reads moved, and which did not

| Route | Where | Why |
|---|---|---|
| `/api/profile/contacts` | service | profile shards only |
| `/api/profile/store-details` | service | profile shards only |
| `/api/profile/specialties` | service | profile shards only |
| `/api/profile/fulfillment-settings` | service | profile shards only |
| `/api/profile/users-by-specialty` | service | the highest-volume profile read; backs seller search and specialty-chat recipients |
| `/api/profile/reviews` | main app | reads the product database as well |
| `/api/profile/discounts` | main app | quotes against product data |
| `/api/profile/store-images` | main app | writes through image storage |
| `/api/profile/editor` | main app | write-only |

Every write stays on the main app: profile writes go through the image storage
orchestrator and touch product-derived counts, neither of which this account can
reach. The contract test asserts no route here exports a write handler, and that
the four excluded paths are absent.

## CORS

`src/app/lib/http.ts` answers `GET, OPTIONS` — its own methods — and
[`BROWSER_REQUEST_HEADERS`](sealed-packages/service-runtime-core-module.md#browser_request_headers)
for the accepted request headers, the same list the main app answers with. It previously advertised
`Content-Type, Accept`; any client header outside that pair would have been rejected at preflight
and surfaced as "Unable to reach the server", not as a CORS error.

## How the main app reaches it

**It does not.** The deployments never call each other. The
[service bridge](service-bridge-module.md) runs in the browser and sends the five
read paths to this origin, everything else to the main app. On the server the
bridge always answers "main app", so a server-rendered request can never be
pointed here.

`profileService` is still used server-side on the main app in many places —
order creation reads fulfilment settings, specialty chat resolves providers —
and those calls go straight to the shards, not through this service.

## Environment

| Variable | Main app | Profiles service |
|---|:---:|:---:|
| The seven `PROFILE_*_DATABASE_URL` / `_AUTH_TOKEN` pairs | yes — writes and server-side reads | yes — the five read routes |
| `NEXT_PUBLIC_ASOL_PROFILES_URL` | yes — client-safe | **no** — it *is* the service |
| `R2_*` (S3 pair + public URL) | yes | yes — avatars are resolved for `users-by-specialty` |
| `R2_API_TOKEN` | yes | **no** — bucket administration, not reading |
| Users, product, orders, notifications, `SYSTEM_OPS_*` | yes | **no** |

## Deploying

```bash
npm run profiles:deploy
```

The project is **not connected to GitHub**. A push redeploys the main app and
changes nothing here.

## Migrating the shards

`npm run db:migrate:profiles` copies rows from `LEGACY_PROFILE_*` to the current
credentials, verifying row counts per table and refusing to finish on a
mismatch. It skips `system-ops` deliberately.

It has already run — 30 rows across eight tables, every count matching — and the
old shards were deleted from `hesham101`, so the `LEGACY_PROFILE_*` variables
are gone from `.env`. The script is kept for the record of how the move was
done; running it again would need those variables re-added.

## Verifying a deployment

```bash
curl https://asol-profiles.vercel.app/api/health
```

Health reports how many of the seven shards are configured and names any missing
— a partial configuration answers requests but returns a profile with pieces
silently absent.

## Boundaries that are not accidents

| Rule | Why |
|---|---|
| Reads only | Profile writes go through image storage and touch product-derived counts. |
| No reviews, discounts, store-images, editor | Each reads or writes beyond the profile shards. |
| `system-ops` stays behind | It holds system logs and data-health records, not profile data. |
| The bridge redirects `GET` only, in the browser only | A redirected write, or a server-side redirect, would make the accounts depend on each other. |
