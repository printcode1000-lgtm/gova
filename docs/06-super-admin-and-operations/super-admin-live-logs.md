# Super Admin System Logs

## Purpose

`/super-admin/logs` displays two log streams:

- Live in-memory logs for the current Super Admin session.
- Persisted central logs collected from Web, Android, iOS, and server/API code.

The goal is that application errors do not disappear silently. Browser runtime
errors, React errors, failed resources, failed API calls, mapped server errors,
and unhandled API route exceptions all have a registration path.

## Client coverage

`SystemLogCollector` is mounted in the root layout. It wraps:

- `console.warn`
- `console.error`
- `window.error`
- `unhandledrejection`
- resource load failures for images, scripts, iframes, and links

The live in-memory store is visible only when the current session is Super Admin.
Persisted warning/error telemetry is submitted for all users through:

```text
POST /api/system-logs/ingest
```

Normal console messages stay local and are not persisted.

## React and Next.js coverage

The root app is wrapped by `SystemLogErrorBoundary`, which records React render
and lifecycle errors with component stack information.

`src/app/global-error.tsx` records root-level Next.js failures that escape route
boundaries.

Several important routes also keep local `error.tsx` files using
`RouteErrorFallback`.

## API and server coverage

Business API routes use `runTracedBusinessRoute`. Unhandled route failures are
persisted with route name and execution context.

Most API route catch blocks return `mapServiceError(error)`. That function now
also records the mapped error centrally before returning a JSON error response.
This closes the common gap where a server error is intentionally caught and
therefore never reaches `console.error`.

The system intentionally does not log the system-log API recursively.

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

The only approved rejection suppression is the final fallback around the logging
call itself, for example `logServerSystemIssue(...).catch(() => undefined)`.
That prevents recursive failures if the central logging route or database is the
thing currently failing.

Non-critical client fallbacks, such as failed page snapshots, push cleanup,
notification receipts, logout cleanup, and profile preview helper loads, now
write `console.warn` or `console.error`. Because the root collector captures
warnings and errors on Web, Android WebView, and iOS WebView, these are no
longer silent.

## Storage

Persistent logs are stored in the profile database:

```text
system_logs
```

Migration:

```text
src/modules/data-access/core/database/profile/migrations/0013_system_logs.sql
```

The repository also creates the table on first use so existing local SQLite
databases are healed without requiring a manual reset.

## Super Admin page

`/super-admin/logs` loads persisted logs through:

```text
GET /api/system-logs?uid=&phone=&limit=
```

Only the configured Super Admin identity can list or clear persisted logs.

The page groups logs by:

- normal
- warning
- error

Persisted entries are marked as saved. The clear-all and clear-section actions
clear both the live local store and the persisted store.

## Platforms

Client logs mark platform as:

- `web`
- `android`
- `ios`

Server logs mark platform as:

- `server`

Capacitor WebView errors are captured at the JavaScript/WebView layer. Native
crashes that terminate the app before JavaScript can run still require a native
crash reporter or a platform bridge, but JavaScript, WebView, API, and server
errors now have a central logging path.

## Privacy and safety

The server redacts common sensitive values before storage:

- email addresses
- Egyptian mobile phone patterns
- token, secret, password, and authorization-like values

Client submissions are deduplicated for a short window before sending. Server
storage deduplicates by fingerprint and increments `occurrences`.

## Source map

```text
src/features/system-logs/
  SystemLogCollector.tsx
  SystemLogErrorBoundary.tsx
  RouteErrorFallback.tsx
  report-system-issue.ts
  persistent-client-log.ts
  entities/persistent-system-log.entity.ts
  repositories/persistent-system-log-repository.ts
  services/persistent-system-log-service.server.ts
  services/persistent-system-log-api-service.ts

src/app/api/system-logs/
src/app/global-error.tsx
src/components/super-admin/SuperAdminLogsPage.tsx
scripts/validate-error-logging.ts
```
