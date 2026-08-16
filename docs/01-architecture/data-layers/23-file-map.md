# File Map (Data Path)

```text
src/
|-- core/
|   |-- api/                         # AsolApiClient and HTTP transport
|   |-- architecture/                # enforced dependency contracts
|   |-- config/                      # runtime and server configuration
|   `-- provisioning/                # R2-only provisioning utilities
|-- modules/
|   `-- data-access/
|       |-- core/
|       |   |-- data-source-registry.ts
|       |   |-- database/            # adapters, schemas, migrations, shards
|       |   `-- turso/               # low-level libSQL clients
|       |-- browser/                 # AsolDB and IndexedDB operations
|       |-- domains/                 # queries, commands, repositories, ports
|       `-- provisioning/core/       # SQLite-to-Turso schema provisioning
|-- features/                        # UI, hooks, client/server feature services
`-- app/api/                         # Business API routes

public/sync_data/
|-- sync_sqlite/                     # local databases and shards
|-- schema-sync-report.json
`-- *-schema-sync-report.json

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

packages/
|-- vercel-deploy-core/              # account registry, GitHub-free project creation, CLI runner
|-- service-mirror-core/             # shared mirror graph walker
|-- account-bridge/                  # device-only Rule 0 inter-account channel (doors . and ./notifications)
|-- notifications-composition/       # notifications composition layer
|-- products-composition/            # products composition layer
|-- orders-composition/              # orders composition layer
|-- profiles-composition/            # profiles composition layer
|-- native-core/                     # sealed native capability boundary
|-- ota-core/                        # sealed OTA updates & release gate boundary
`-- storage-core/                    # central binary & R2 image storage boundary

src/modules/
|-- notification-bridge/             # re-exports @asol/account-bridge/notifications
`-- service-bridge/                  # re-exports @asol/account-bridge
```

`services/` sits outside `src/` on purpose: it is deployed on its own, and the
root `tsconfig.json` excludes it so the two module graphs never merge. See
[Notifications Service Module](../../05-platform-features/notifications-service-module.md).

## Client and server entry points

| Concern | Client | Server |
|---|---|---|
| HTTP | `asolApi` | Business API routes |
| Browser persistence | `@/modules/data-access/browser` | Not available |
| Domain data | Client API service | `domains/<domain>/index.server.ts` |
| Database source | Not available | Central `DataSourceRegistry` |

See [25-central-data-access-module.md](./25-central-data-access-module.md).
