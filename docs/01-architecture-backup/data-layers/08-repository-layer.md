# Repository Layer

## Role

Repositories own persistence mapping and database statements for one domain.

## Location

`packages/data-core/src/domains/[domain]/repositories/`

## Responsibilities

| Allowed | Forbidden |
|---|---|
| Drizzle or parameterized SQL | UI and hooks |
| Typed data-source or port injection | Choosing environment in a feature |
| Row-to-entity mapping | Exposing credentials or SQL to clients |

## Pattern

```typescript
constructor(private database: IDatabaseClient = profilesDataSource) {}

async getByUid(uid: string) {
  return this.database.db.select().from(userProfiles).where(eq(...));
}
```

The central data-source registry chooses SQLite in development and Turso in
production. A repository knows its logical source, never a file name or URL.

## Adding persistence

1. Add or update the schema under `packages/data-core/src/core/database`.
2. Add a focused repository method and its typed contract.
3. Call it from a query or command.
4. Export the public operation through the domain `index.server.ts`.

See [25-central-data-access-module.md](./25-central-data-access-module.md).
