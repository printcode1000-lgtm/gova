# Repository Layer

## Role

Entity-level data access — Drizzle queries only.

## Location

`src/features/[feature]/repositories/`

```
*-repository.interface.ts
*-repository.ts
```

## Data responsibilities

| Allowed | Forbidden |
|---------|-----------|
| `database.db.select/insert/update` | Raw SQL strings (except via Drizzle) |
| Inject `IDatabaseClient` (mockable) | UI, Hooks |
| Map row ↔ entity | Choose SQLite vs Turso |

## Pattern

```typescript
constructor(private database: IDatabaseClient = profileDbClient) {}

async getByUid(uid: string) {
  return this.database.db.select().from(userProfiles).where(eq(...));
}
```

## One repository per database client

| Repository | Database Client |
|------------|-----------------|
| `UserRepository` | `dbClient` |
| `ProfileRepository` | `profileDbClient` |

Repository does **not** know the `.db` filename — only the client.

## Adding a table

1. Schema under `src/core/database/`
2. Repository methods + interface
3. Wire in `operations/instances.ts`
