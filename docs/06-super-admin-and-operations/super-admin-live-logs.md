# Super Admin System Logs

## Purpose

`/super-admin/logs` displays two log streams:

- Live in-memory logs for the current Super Admin session.
- Persisted central logs collected from Web, Android, iOS, and server/API code.

The goal is that **no error, break, or gap can remain silent** across operating
systems and scenarios. Browser runtime errors, React errors, failed resources,
failed API calls, mapped server errors, pre-auth bootstrap failures, and
unhandled API route exceptions all have a registration path.

## Sealed package

Core logic lives in `@asol/system-logs-core` (see
[module-isolation-rules.md](../01-architecture/02-packages/module-isolation-rules.md)).
The application wires ports through:

```text
src/features/system-logs/application/system-logs-core-bootstrap.ts        (browser)
src/features/system-logs/application/system-logs-core-bootstrap.server.ts (server)
```

Doors:

- `@asol/system-logs-core` — browser-safe capture, memory store, sanitization
- `@asol/system-logs-core/server` — persistence, ingest validation, retention, SSE

`test:system-logs-core` gates `build`, `build:static`, and `test`.

## Client coverage

`SystemLogCollector` mounts in the root layout and calls `installGlobalCapture()`
from the package. One coordinator deduplicates submissions and covers:

- `console.warn` / `console.error` (and other console levels for live view)
- `window.error`
- `unhandledrejection`
- resource load failures (images, scripts, iframes, links)
- native crash bridge via `asol:native-crash` custom events

The live in-memory store is visible only when the current session is Super Admin
(max 2,000 entries). Persisted warning/error telemetry is submitted for all
users through:

```text
POST /api/system-logs/ingest
```

Normal console messages stay local and are not persisted.

In `next dev`, same-origin `/_next/static/chunks/*` load failures are treated as
development transport churn rather than production faults. Turbopack can invalidate
a chunk URL while recompiling or while the development server restarts; the browser
console/network panel still shows that failed request, but Global Capture does not
persist it. This exemption is development-only: Web production, Static `out/`,
Android, and iOS continue to persist real resource and `ChunkLoadError` failures.

The pre-auth reporter imports `@asol/system-logs-core` statically. The root collector
already owns that browser-safe package in the application graph, so creating a second
dynamic package chunk adds failure surface without providing isolation.

Explicit `reportPreAuthFailure()` and `reportSystemIssue()` calls in catch
blocks remain required for failures that are caught before they reach global
handlers.

## React and Next.js coverage

The root app is wrapped by `SystemLogErrorBoundary`, which records React render
and lifecycle errors with component stack information.

`src/app/global-error.tsx` records root-level Next.js failures that escape route
boundaries.

Several important routes also keep local `error.tsx` files using
`RouteErrorFallback`.

## API and server coverage

Business API routes use `runTracedBusinessRoute`. Unhandled route failures are
persisted with route name and execution context. Errors already logged by the
tracer are marked so `mapServiceError` does not double-persist them.

Most API route catch blocks return `mapServiceError(error)`. That function
records the mapped error centrally before returning a JSON error response unless
the error was already logged.

The system intentionally does not log the system-log API recursively.

## Expected business rejections (not system faults)

Known 4xx codes that represent normal user/input rejection — wrong password,
duplicate phone, expired session, and similar — must **not** be persisted as
central system errors. The canonical list lives in
`src/core/api/expected-business-error-codes.ts`:

- `mapServiceError()` skips persistence for `QUIET_MAPPED_SERVICE_ERROR_CODES`
- Profile save hooks skip `reportSystemIssue()` for expected profile rejections
- Auth/profile API clients use `suppressErrorLog: true` on routes where 400
  responses are part of normal UX (login, profile update, profile editor save)

Unexpected failures on those routes still log normally.

## Silent error guard

The project includes a validation guard:

```text
npm run validate:error-logging
```

It is also part of `npm test`. The guard fails when it finds:

- empty `catch {}` blocks outside approved generated bootstrap scripts
- promises suppressed with `.catch(() => undefined)` or `.catch(() => null)`
  without logging context
- API routes without a tracing wrapper or a catch block
- search API catch blocks that return generic errors instead of
  `mapServiceError(error)`
- pre-auth critical files without `reportPreAuthFailure` or `reportSystemIssue`

The only approved rejection suppression is the final fallback around the logging
call itself, for example `logServerSystemIssue(...).catch(() => undefined)`.

Package tests include a scenario-coverage check that asserts every capture
surface file exists (collector, boundary, global-error, traced-route, etc.).

## Storage

Persistent logs are stored in the `system-ops` Turso database, table
`system_logs`. Its schema — including the origin/trust, truncation, and
correlation columns — is declared in the `system-ops` desired-schema manifest and
applied by provisioning. The repository is data-only: it used to create the
table, add its own columns and build its own indexes on every call, which made it
a second schema authority alongside provisioning. The Drizzle schema and
`0013_system_logs.sql` mirror those columns, and the offline schema-parity test
prevents the manifest, the Drizzle declaration and the migration history from
silently diverging. Correlation columns are:

- `correlation_id`
- `request_flow_id`
- `session_id`
- `monitor_trace_id`

Retention runs on write (`SYSTEM_LOGS_RETENTION_DAYS`, default 90). Summary
reads are deliberately bounded to the recent seven-day window and backed by the
`system_logs` timestamp/level/feature indexes so `/api/system-logs/summary`
does not perform an unbounded aggregate scan over the whole operational log
table.

## Super Admin APIs

| Route | Purpose |
|-------|---------|
| `GET /api/system-logs` | Paginated list (`cursor`, `query`, `platform`, `feature`, …) |
| `GET /api/system-logs/summary` | Dashboard totals and top features |
| `GET /api/system-logs/stream` | SSE live feed for Super Admin |
| `POST /api/system-logs/ingest` | Client/server telemetry ingest |
| `DELETE /api/system-logs` | Clear by level or all |

Only the configured Super Admin identity can list, stream, or clear persisted
logs. Control routes must authenticate these operations through the shared
`assertControlSuperAdminToken` guard in `services/control/src/control/super-admin-route.ts`.
That module registers the canonical Super Admin UID/phone before identity comparison.
System Logs accepts the token from `x-asol-session-token` for normal requests and
from the `sessionToken` query parameter for SSE, then passes either form to the
same initialized guard. A System Logs-only verifier must not call
`isSuperAdminIdentity` before that Control bootstrap, because its default identity
resolver is not the production Control identity configuration.

## Super Admin page

`/super-admin/logs` shows:

- summary cards (recent seven-day errors, last hour, top features)
- search and platform filters
- cloud error panel with HTTP/feature filters
- live section tabs (normal / warning / error) always in one row at every
  breakpoint; narrow viewports use compact padding, smaller icons, and truncated
  Arabic labels so counts stay visible
- SSE refresh throttled to at most once per minute plus a 5-minute polling fallback

Persisted entries are marked as saved. The floating error button deduplicates
live and persisted counts by fingerprint. It is overlay chrome: tapping it
while `PageSaveDialog` or another shared dialog is open does not dismiss that
dialog, and tapping the inspector or development badge does not fold the
expanded error toolbar.

Telemetry ingest never emits the local `asol:system-logs-changed` refresh event.
Only explicit mutations such as clearing logs notify local readers. This prevents
a failed authenticated list request from becoming a feedback loop where the
warning about that failure is ingested and immediately triggers the same failed
list request again. Normal freshness comes from SSE throttled to one reload per
minute and a five-minute polling fallback, and the Super Admin page requests only
the recent seven-day window by default so large historical log tables are not
rescanned during routine monitoring.

Neither the page nor the floating button clears logs on tap. Both stage a
`delete` operation in `@asol/page-save-core` (`super-admin-logs` and
`system-logs-floating` scopes) and the header save dialog runs it; see
`docs/05-platform-features/page-save-system.md`.

## Platforms

| Platform | Capture path |
|----------|----------------|
| `web` | Global capture + ingest |
| `android` | Capacitor WebView + ingest |
| `ios` | Capacitor WebView + ingest |
| `server` | `logServerSystemIssue` + trusted ingest |

Native crashes before JavaScript loads are captured by `NativeCrashPlugin` in
`@asol/native-core`, which dispatches `asol:native-crash` to the WebView. The
system-logs bootstrap forwards those records to ingest automatically.

## Privacy and safety

The server redacts common sensitive values before storage. Client submissions
are deduplicated for 15 seconds before sending. Server storage deduplicates by
fingerprint and increments `occurrences`.

Optional alert webhook (`SYSTEM_LOGS_ALERT_WEBHOOK_URL`) fires when the same
fingerprint exceeds the threshold within the alert window.

## Environment variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `SYSTEM_LOGS_RETENTION_DAYS` | `90` | Prune logs older than N days |
| `SYSTEM_LOGS_ALERT_THRESHOLD` | `10` | Occurrences before webhook |
| `SYSTEM_LOGS_ALERT_WINDOW_MS` | `3600000` | Alert window (1 hour) |
| `SYSTEM_LOGS_ALERT_WEBHOOK_URL` | — | Optional POST target |

## Source map

```text
packages/system-logs-core/
  src/index.ts
  src/server.ts
  src/browser/global-capture.ts
  src/browser/capture-coordinator.ts
  src/server/repository.ts
  src/server/persistent-log-service.ts
  src/tests/scenario-coverage.test.ts

src/features/system-logs/
  SystemLogCollector.tsx
  system-logs-core-bootstrap.ts
  system-logs-core-bootstrap.server.ts

src/app/api/system-logs/
src/app/global-error.tsx
src/features/super-admin/presentation/SuperAdminLogsPage.tsx
scripts/validate-error-logging.ts
```
