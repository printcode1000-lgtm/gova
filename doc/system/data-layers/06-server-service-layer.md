# Server Service Layer

## Role

Server-side business logic — orchestrate Queries and Commands, validation, error mapping.

## Location

`src/features/[feature]/services/`

| File | Purpose |
|------|---------|
| `*-service.server.ts` | Class + business logic |
| `*-service.bootstrap.server.ts` | Wiring + singleton for API routes |
| `operations/instances.ts` | Create Command/Query with Repository |

## Data responsibilities

| Allowed | Forbidden |
|---------|-----------|
| `command.execute()` / `query.execute()` | Direct Drizzle |
| `traceServerLayer` for dev monitor | UI, Hooks, Client Service |

## Flow

```
Business API → AuthService.register()
  → CreateUserCommand.execute()
  → UserRepository.create()
```

## Rule

Server Service = **domain logic** — does not know SQLite vs Turso (goes through Repository → Database Client).
