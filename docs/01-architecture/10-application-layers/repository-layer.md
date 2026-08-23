# Repository Layer

## Purpose

Persistence interface between operations layer and database client — owns SQL/Drizzle usage for domain rows.

## Scope

Repositories under `packages/data-core/src/domains/**/` and application repository adapters where pinned.

## Responsibilities

- Translate domain operations to queries
- Encapsulate Drizzle usage for domain tables
- No HTTP, UI, or business route concepts

## May import

- `@asol/data-core` database client and Drizzle types in allowed zones
- Domain entity types
- Other `@asol/*` doors when domain requires (through data-core composition)

## Must never import

- UI, hooks, client code
- Raw fetch or API routes
- `@libsql/client` / `better-sqlite3` outside data-core database client modules

## Central owner

All database driver access ultimately lives in `@asol/data-core`. Application repositories are either inside data-core domains or pinned app edges documented in ADR-0002.

Operational detail: [docs/02-data-and-storage/](../../02-data-and-storage/).

## Source Map

- Domains: `packages/data-core/src/domains/`

## Related Documents

- [Database Client Layer](./database-client-layer.md)
- [Mandatory Gateways](../05-capability-enforcement/mandatory-gateways.md)

## Change Impact

Repository logic outside data-core requires strong justification and pinned edge budget.

## Invariants

`drizzle-orm` imports only in repository and `packages/data-core/src/core/database/**`.
