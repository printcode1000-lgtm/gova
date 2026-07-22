# Business API Layer

## Role

Server entry point — accept JSON, delegate to Server Service, return JSON.

## Location

`src/app/api/[feature]/`

## Data responsibilities

| Allowed | Forbidden |
|---------|-----------|
| `authService` from `*-bootstrap.server.ts` | Repository, Operations, `dbClient` |
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

## Adding an API for a new database

1. Route under `src/app/api/<domain>/`
2. Import only `*-service.bootstrap.server.ts`
3. Add path to `ASOL_API_ROUTES`
