# Query / Command Layer (CQRS)

## Role

Separate reads (queries) from writes (commands). Each file owns one operation
or one cohesive transactional aggregate.

## Location

`packages/data-core/src/domains/[domain]/queries/` and
`packages/data-core/src/domains/[domain]/commands/`

```text
domains/[domain]/
|-- queries/
|-- commands/
|-- repositories/
`-- index.server.ts
```

## Responsibilities

| Query | Command |
|---|---|
| Read through a repository or typed port | Validate and coordinate writes |
| No hidden side effects | Own transaction boundaries when needed |

Queries and commands do not select SQLite or Turso. Server services consume
them through the domain `index.server.ts` entry point.

## Adding an operation

1. Add one query or command file.
2. Depend on a repository interface or narrow data port.
3. Export public operations from the domain `index.server.ts`.
4. Inject or call the operation from the server service.

See [25-central-data-access-module.md](./25-central-data-access-module.md).
