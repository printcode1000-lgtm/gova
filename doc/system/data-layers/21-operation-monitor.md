# Operation Monitor (`/dev/monitor`)

Available when `NODE_ENV === 'development'`. End-to-end visibility across client and server data paths.

## Coverage matrix

| Data path | Monitored? | How | UI layer |
|-----------|------------|-----|----------|
| TanStack Query | Yes | `query-observer.ts` + hook `meta` | hook, cache |
| GovaApiClient → API | Yes | `gova-api-monitor.ts` | gova-api |
| Server trace | Yes | `X-Gova-Dev-Trace` header | service, query, database |
| Drizzle SQL (dev) | Yes | `drizzle-dev-logger.ts` | database |
| GovaDB IndexedDB | Yes | `gova-db-monitor.ts` | cache |
| Query persister | Yes | Instrumented IDB ops | cache |
| `getPublicJson` | Yes | HTTP layer | cache |
| Bundled JSON / i18n imports | No | Build-time | — |
| `localStorage` theme | No | Outside data plane | — |
| Provisioning / schema-sync at CI | No | Not browser runtime | — |
| Turso Platform API | No | Build scripts only | — |

## Dev trace header (`X-Gova-Dev-Trace`)

Business API responses may include a base64url JSON array of server events:

```
Business API (runTracedBusinessRoute)
  → ServerService (traceServerLayer)
  → Query/Command (traceServerLayer)
  → Drizzle (drizzle-dev-logger)
```

`GovaApiClient` merges server events into the monitor store via `parentId` linking to the HTTP record.

**Key files:**

| File | Role |
|------|------|
| `server-trace.ts` | AsyncLocalStorage collector |
| `trace-server-layer.ts` | Service/command/query spans |
| `drizzle-dev-logger.ts` | SQL in trace |
| `emit-server-trace.ts` | Client parser |
| `gova-api-monitor.ts` | HTTP + header ingestion |
| `gova-db-monitor.ts` | IndexedDB ops |
| `auth-monitor-meta.ts` | Standard hook `meta` |

## Request flow grouping

`startNewFlow()` on login/register submit groups operations by `requestFlowId` in TIMELINE and OPERATIONS tabs.

## Dashboard tabs

| Tab | Purpose |
|-----|---------|
| **DASHBOARD** | Stats: ops count, cache hit rate, slow queries, N+1 alerts |
| **OPERATIONS** | Live trace tree by request flow |
| **TIMELINE** | Flame chart + step replay per flow |
| **CALL-GRAPH** | Layer-to-layer directed graph |
| **DEPENDENCY** | Service → Repository → Query map |
| **ANALYTICS** | Top features, pages, tables, repositories |
| **SCHEMA-SYNC** | Last `schema-sync-report.json` (static, not live) |
| **PINNED** | Bookmarked operations |

## Filters

Feature, page, component, hook, service, repository, table, entity, query key, op type, status, DB driver, cache source, free-text search.

## Header controls

Pause/resume stream, clear logs, export JSON/HTML, print PDF, light/dark theme.

## Operation detail drawer

Trace IDs, HTTP method/route, duration, SQL (when captured), query result diff, errors.

## Hook integration example

```typescript
meta: authMonitorMeta('useLogin', 'LoginPageContent', 'Login', 'UPDATE'),
// onSubmit: startNewFlow() then mutation.mutate()
```

## Out of scope (by design)

- Static imports (`import data from '@/data/...'`)
- Theme in `localStorage`
- CI `db:schema:sync` during deploy
- Direct provisioning HTTP

## Legacy note

Auth uses Drizzle directly; server SQL visibility comes from **`drizzle-dev-logger`** in the trace header, not `AbstractDatabaseClient._trackedExecute()`.

## Schema sync panel

Reads `public/sync_data/schema-sync-report.json` and profile report. If missing, run `npm run db:schema:sync` or deploy backend first. See [20-schema-provisioning.md](./20-schema-provisioning.md).
