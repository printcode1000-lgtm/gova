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
```

## Client and server entry points

| Concern | Client | Server |
|---|---|---|
| HTTP | `asolApi` | Business API routes |
| Browser persistence | `@/modules/data-access/browser` | Not available |
| Domain data | Client API service | `domains/<domain>/index.server.ts` |
| Database source | Not available | Central `DataSourceRegistry` |

See [25-central-data-access-module.md](./25-central-data-access-module.md).
