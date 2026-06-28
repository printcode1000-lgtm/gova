# GOVA Data Layers

Authoritative reference for how data flows through GOVA — from UI to database and back. Clients never talk to SQLite or Turso directly; they use **GovaApiClient** and Business APIs.

## Data path (read / write)

```
UI → Hook → Client Service → GovaApiClient → Business API
  → Server Service → Query/Command → Repository → Database Client → SQLite | Turso
```

## Core technologies

| Technology | Role |
|---|---|
| **GovaApiClient** | Single HTTP gateway for client-side data access |
| **Business API Routes** | Server entry points (`/api/auth/*`, `/api/profile/*`, …) |
| **Drizzle ORM** | Schema definition and type-safe queries |
| **drizzle-zod** | Zod schemas from Drizzle tables |
| **TanStack Query** | Server-state cache, mutations |
| **GovaDB (IndexedDB)** | Session + React Query persistence (cache only) |
| **SQLite** | Dev DB — schema SSOT |
| **Turso** | Prod DB — DDL synced from SQLite, no row migration |

## Layer docs

| # | Topic | File |
|---|--------|------|
| 1 | UI | [01-ui-layer.md](./01-ui-layer.md) |
| 2 | Hooks | [02-hooks-layer.md](./02-hooks-layer.md) |
| 3 | Client Service | [03-client-service-layer.md](./03-client-service-layer.md) |
| 4 | GovaApiClient | [04-gova-api-client-layer.md](./04-gova-api-client-layer.md) |
| 5 | Business API | [05-business-api-layer.md](./05-business-api-layer.md) |
| 6 | Server Service | [06-server-service-layer.md](./06-server-service-layer.md) |
| 7 | Query / Command | [07-query-command-layer.md](./07-query-command-layer.md) |
| 8 | Repository | [08-repository-layer.md](./08-repository-layer.md) |
| 9 | Database Client | [09-database-client-layer.md](./09-database-client-layer.md) |
| 10 | Cache, rules, data flow | [10-cache-rules-and-data-flow.md](./10-cache-rules-and-data-flow.md) |
| 11 | Current databases | [11-current-databases.md](./11-current-databases.md) |

## Extended reference

| Topic | File |
|--------|------|
| Input validation | [12-input-validation.md](./12-input-validation.md) |
| Configuration layer | [13-configuration-layer.md](./13-configuration-layer.md) |
| Environment variables | [14-environment-variables.md](./14-environment-variables.md) |
| Security rules | [15-security-rules.md](./15-security-rules.md) |
| Deployment targets | [16-deployment-targets.md](./16-deployment-targets.md) |
| Adding a new feature | [17-extending-features.md](./17-extending-features.md) |
| Testability | [18-testability.md](./18-testability.md) |
| Architecture contract | [19-architecture-contract.md](./19-architecture-contract.md) |
| Schema & provisioning | [20-schema-provisioning.md](./20-schema-provisioning.md) |
| Operation monitor | [21-operation-monitor.md](./21-operation-monitor.md) |
| Scripts & workflows | [22-scripts-and-workflows.md](./22-scripts-and-workflows.md) |
| File map | [23-file-map.md](./23-file-map.md) |

## Related docs

- [session-system.md](../session-system.md)
- [profile-system.md](./profile-system.md)
- [capacitor.md](../capacitor.md)
- [../problems/README.md](../problems/README.md)
