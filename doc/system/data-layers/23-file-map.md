# File Map (Data Path)

```
src/
├── core/
│   ├── api/                    # GovaApiClient, HTTP transport, routes
│   ├── architecture/           # contract.ts
│   ├── config/                 # process.env (Configuration layer)
│   ├── database/               # dbClient, profileDbClient, schemas, migrations
│   ├── provisioning/           # schema sync, Turso provisioning
│   └── monitor/                # query-observer, gova-api-monitor, server-trace
├── features/
│   ├── auth/
│   │   ├── hooks/
│   │   ├── services/           # client + server + bootstrap
│   │   ├── operations/
│   │   └── repositories/
│   └── profile/
│       ├── hooks/
│       ├── services/
│       ├── operations/
│       └── repositories/
├── lib/
│   ├── gova-db/                # IndexedDB (cache)
│   └── db/                     # turso.ts, turso-profile.ts
└── app/
    └── api/                    # Business API routes

public/
└── sync_data/
    ├── sync_sqlite/            # allusers.db, profile.db
    ├── schema-sync-report.json
    └── profile-schema-sync-report.json

scripts/
├── architecture-check.ts
├── schema-sync.ts
├── provision-turso.ts
├── ensure-sqlite-databases.ts
├── create-sqlite-db.ts
├── create-profile-sqlite-db.ts
└── push-vercel-turso-env.ts
```

## Client vs server entry points

| Concern | Client | Server |
|---------|--------|--------|
| Auth | `auth-service.ts` → `auth-api-service.ts` | `auth-service.bootstrap.server.ts` |
| Profile | `profile-service.ts` → `profile-api-service.ts` | `profile-service.bootstrap.server.ts` |
| HTTP | `govaApi` | N/A (routes call services) |
| DB | GovaDB (cache) | `dbClient` / `profileDbClient` |
