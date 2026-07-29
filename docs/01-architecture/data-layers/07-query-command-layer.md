# Query / Command Layer (CQRS)

## Role

Separate **reads** (Query) from **writes** (Command) — one DB operation or a related group per class.

## Location

`src/features/[feature]/operations/`

```
operations/
├── queries/
├── commands/
└── instances.ts
```

## Responsibilities

| Query | Command |
|-------|---------|
| Read via Repository | Write/update via Repository |
| No hidden side effects | Domain rules before INSERT/UPDATE |

## Allowed / forbidden

| Allowed | Forbidden |
|---------|-----------|
| `IUserRepository`, `IProfileRepository` | Direct `dbClient` |
| `import 'server-only'` | Client imports |

## Rule

Query/Command = **use-case DB operations** — Repository runs Drizzle.

## Adding an operation

1. New Command or Query class
2. Register in `instances.ts`
3. Inject into Server Service
