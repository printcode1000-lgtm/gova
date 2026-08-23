# Business API Layer

## Role

Server entry point — accept JSON, delegate to Server Service, return JSON.

## Location

`src/app/api/[feature]/`

## Data responsibilities

| Allowed | Forbidden |
|---------|-----------|
| `authService` from `*-bootstrap.server.ts` | Repository, Operations, `usersDataSource` |
| `apiSuccess()` / `mapServiceError()` | Client Service |

## Route pattern

```
POST /api/auth/login
  → authService.login(body)
  → return { uid, phone, email, specialties, sessionToken }
```

## Current routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/auth/login` | POST | Authenticate |
| `/api/auth/register` | POST | Create account |
| `/api/auth/profile` | PUT | Update registration fields |
| `/api/auth/logout` | POST | No-op server-side (session is client IDB) |
| `/api/profile/contacts` | GET/PUT | Profile contact JSON |

## CORS

`src/middleware.ts` adds CORS headers for `/api/*` so Static/Capacitor can call a remote backend. Configure via `ASOL_CORS_ORIGINS`.

## Dev migrations

Applied on first SQLite connection in `sqlite-db-client.ts` — not in route handlers.

## Rule

Business API = **JSON boundary** — no SQL in routes.

## User-facing errors

API routes must return **stable error codes** only, never raw exception text.
`mapServiceError()` and `apiError()` sanitize unknown or technical messages to
`internalServerError` / `requestFailed` before they reach the client. The full
failure is still logged through `@asol/system-logs-core` on the server.

In the browser, `formatUserFacingApiError()` / `useTranslation().formatApiError`
map those codes (and network failures) to localized copy under `errors.api.*`.
UI must not render `error.message` from API failures directly.

## Adding an API for a new database

1. Route under `src/app/api/<domain>/`
2. Import only `*-service.bootstrap.server.ts`
3. Add path to `ASOL_API_ROUTES`
