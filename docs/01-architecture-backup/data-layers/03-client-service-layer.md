# Client Service Layer

## Role

HTTP adapter on the client — same interface (`IAuthService`, `IProfileService`) regardless of environment.

## Location

`src/features/[feature]/services/`

| File | Purpose |
|------|---------|
| `*-service.ts` | Client entry (`export … as …Service`) |
| `*-api-service.ts` | Implements interface via `asolApi` |
| `*-service.interface.ts` | Shared contract |

## Data responsibilities

| Allowed | Forbidden |
|---------|-----------|
| `asolApi.get/post/put` + `ASOL_API_ROUTES` | SQL, Drizzle, Repository |
| Map JSON ↔ entities | Heavy domain logic (belongs in Server Service) |

## Flow

```
Hook → authService.login() → AuthApiService → asolApi.post('/api/auth/login')
```

## Rule

Client Service = **JSON gateway to the API** — never chooses SQLite vs Turso.
