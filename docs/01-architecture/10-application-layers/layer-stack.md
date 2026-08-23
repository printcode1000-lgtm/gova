# Layer Stack

## Purpose

Single reference for the full application layer stack, import direction, and hard bans.

## Scope

Enforced stack for all features. Source matrix: `packages/architecture-core/src/contracts/contract.ts`.

## Stack diagram

```text
┌─────────────────────────────────────────────────────────────┐
│  UI (components, pages)                                     │
├─────────────────────────────────────────────────────────────┤
│  Hooks                                                      │
├─────────────────────────────────────────────────────────────┤
│  Client Services                                            │
├─────────────────────────────────────────────────────────────┤
│  AsolApiClient (HTTP transport — single module)             │
├─────────────────────────────────────────────────────────────┤
│  Business API (route handlers, bootstrap imports)           │
├─────────────────────────────────────────────────────────────┤
│  Server Services                                            │
├─────────────────────────────────────────────────────────────┤
│  Query / Command (operations layer)                         │
├─────────────────────────────────────────────────────────────┤
│  Repository                                                 │
├─────────────────────────────────────────────────────────────┤
│  Database Client (@asol/data-core)                          │
├─────────────────────────────────────────────────────────────┤
│  SQLite (local) / Turso (production)                        │
└─────────────────────────────────────────────────────────────┘

Configuration layer (src/core/config) — env reads only; crosses via injection
```

## Import matrix (summary)

| Layer | May import | Must never import |
|---|---|---|
| UI | Hooks, presentation components, browser-safe `@asol/*` | Repository, DB, Drizzle, server services |
| Hooks | Client services | Repository, database, Drizzle |
| Client services | AsolApiClient | `fetch` directly, SQL, repository |
| AsolApiClient | HTTP transport module | Direct DB |
| Business API | Server service bootstrap | Repository direct, client services |
| Server services | Query/command | Repository direct, Drizzle, DB client |
| Query/command | Repository interfaces | DB client, Drizzle |
| Repository | Database client, Drizzle in allowed zones | UI, hooks, client code |
| Database client | Drivers (inside data-core) | Application layers above |

## Hard bans

| Construct | Allowed only in |
|---|---|
| `fetch()`, axios, XHR | `asol-http-transport.ts` |
| Raw SQL | Repository, database client, provisioning |
| `drizzle-orm` | Repository, `packages/data-core/src/core/database/**` |
| `@libsql/client`, `better-sqlite3` | Database client, provisioning |
| `process.env` | `src/core/config/*` |
| Secrets in client bundles | Forbidden |
| `server-only` in Client Components | Forbidden |

## Wiring convention

Commands/queries instantiated in `operations/instances.ts`. API routes import bootstrap server modules — not repository implementations directly.

## Source Map

- Contract: `packages/architecture-core/src/contracts/contract.ts`
- Backup layers: `docs/01-architecture-backup/data-layers/01-ui-layer.md` through `09-database-client-layer.md`

## Related Documents

- Individual layer docs in this folder
- [Architecture Check](../07-enforcement/architecture-check.md)

## Change Impact

Shortcut paths fail scan — add behavior through correct layer instead of bypass.

## Invariants

Every feature follows the same stack. No architectural waivers.
