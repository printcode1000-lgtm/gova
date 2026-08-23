# Operations Layer (Query / Command)

## Purpose

The query and command layer executing single logical database operations through repository interfaces.

## Scope

`src/features/**/operations/`, query/command modules, `operations/instances.ts` wiring.

## Responsibilities

- One operation = one repository call pattern (or coordinated unit)
- No HTTP or UI concepts
- Instantiate with repository dependencies from `instances.ts`

## May import

- Repository interfaces and implementations (via injection)
- Domain types from `@asol/data-core/<domain>/entities` where appropriate
- Pure validation helpers

## Must never import

- UI, hooks, client services
- Database client directly (go through repository)
- HTTP transport

## Wiring

Commands/queries created in `operations/instances.ts`. Server services receive ready instances — routes never construct operations ad hoc.

## Source Map

- Backup: `docs/01-architecture-backup/data-layers/07-query-command-layer.md`

## Related Documents

- [Repository Layer](./repository-layer.md)
- [Server Service Layer](./server-service-layer.md)

## Change Impact

New DB access needs new operation + repository method — not server service SQL.

## Invariants

Operations layer is the only layer above repository that performs persistence logic.
