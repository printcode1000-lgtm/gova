# File Map (Data Path)

## Purpose

Preserved operational and architectural detail from `docs/01-architecture-backup/`. Agents use this for implementation guidance.

## Scope

See sections below. Architectural relationships defer to [docs/01-architecture/README.md](../README.md) where applicable.

---

```text
src/
|-- core/
|   |-- api/                         # AsolApiClient and HTTP transport
|   |-- architecture/                # enforced dependency contracts
|   |-- config/                      # runtime and server configuration
|   `-- provisioning/                # R2-only provisioning utilities
|-- features/                        # UI, hooks, client/server feature services
`-- app/api/                         # Business API routes

packages/data-core/                  # @asol/data-core — every database, sealed
|-- package.json                     # the 24 doors; nothing else is importable
`-- src/
    |-- index.ts                     # door "."         module identity + backend policy
    |-- ports/telemetry.ts           # door "./telemetry"
    |-- core/
    |   |-- index.ts                 # door "./core"    data source registry
    |   |-- data-source-registry.ts
    |   |-- database/                # NO DOOR — drivers, schemas, migrations, shards
    |   `-- turso/                   # low-level libSQL clients
    |-- browser/index.ts             # door "./browser" AsolDB and IndexedDB
    |-- domains/<name>/index.server.ts  # one door per domain (18)
    |-- provisioning/core/index.ts   # door "./provisioning"
    |-- tooling/index.ts             # door "./tooling"
    `-- tests/                       # contract + schema parity, gate: test:data-core

public/sync_data/
|-- sync_sqlite/                     # local databases and shards (@asol/dev-core paths)
|-- sync_file/images/                # local image files (@asol/dev-core paths)
|-- schema-sync-report.json
`-- *-schema-sync-report.json

Local development path contract: [dev-core-module.md](../../02-data-and-storage/dev-core-module.md).

services/
|-- notifications/                   # independent module, own Vercel account
|   |-- src/app/api/notifications/send/  # the only fan-out route in the system
|   |-- src/app/api/health/
|   |-- generated/                   # mirrored from src/, git-ignored
|   |-- stubs/better-sqlite3.js
|   |-- package.json                 # its own dependencies
|   `-- .vercelignore                # forces generated/ into the upload
|-- products/                        # independent module, own Vercel account
|   |-- src/app/api/products/        # GET only; writes stay on the main app
|   |-- src/app/api/search/          # products + fields (sellers stays behind)
|   |-- src/app/lib/http.ts          # CORS and error mapping
|   |-- src/config/                  # storage-profiles.json, read via fs
|   `-- generated/                   # mirrored from src/ and public/
|-- orders/                          # independent module, own Vercel account
|   |-- src/app/api/orders/          # the list only; /:id and writes stay behind
|   `-- generated/                   # mirrored from src/
`-- profiles/                        # independent module, own Vercel account
    |-- src/app/api/profile/         # contacts, store-details, specialties,
    |                                # fulfillment-settings, users-by-specialty
    |-- src/config/                  # storage-profiles.json, read via fs
    `-- generated/                   # mirrored from src/ and public/

packages/                            # four layers - see ../02-packages/module-isolation-rules.md
|-- account-declarations/            # layer 3: pure data, imports nothing.
|                                    # doors: "." plus one per account
|-- vercel-deploy-core/              # account registry, GitHub-free project creation, CLI runner
|-- service-mirror-core/             # shared mirror graph walker
|-- account-bridge/                  # device-only Rule 0 inter-account channel (doors . and ./notifications)
|-- notifications-composition/       # notifications composition layer
|-- products-composition/            # products composition layer
|-- orders-composition/              # orders composition layer
|-- profiles-composition/            # profiles composition layer
|-- native-core/                     # sealed native capability boundary
|-- ota-core/                        # sealed OTA updates & release gate boundary
|-- storage-core/                    # central binary & R2 image storage boundary
`-- dev-core/                        # sealed local development path contract

src/modules/
|-- notification-bridge/             # re-exports @asol/account-bridge/notifications
`-- service-bridge/                  # re-exports @asol/account-bridge
```

`services/` sits outside `src/` on purpose: it is deployed on its own, and the
root `tsconfig.json` excludes it so the two module graphs never merge. See
[Notifications Service Module](../../05-platform-features/notification-system.md).

## Client and server entry points

| Concern | Client | Server |
|---|---|---|
| HTTP | `asolApi` | Business API routes |
| Browser persistence | `@asol/data-core/browser` | Not available |
| Domain data | Client API service | `domains/<domain>/index.server.ts` |
| Database source | Not available | Central `DataSourceRegistry` |

See [central-data-access.md](../../02-data-and-storage/central-data-access.md).
