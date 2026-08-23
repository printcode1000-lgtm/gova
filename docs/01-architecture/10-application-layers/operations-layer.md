# Operations Layer (Query / Command)

## Purpose

The query and command layer executing single logical database operations through repository interfaces.

## Scope

`packages/data-core/src/domains/**/index.server.ts` and
`packages/data-core/src/domains/**/commands/**`, plus any path containing
`/operations/`.

There is no `src/features/**/operations/` directory in this repository — the
layer moved into `@asol/data-core`'s domains. `classifyFile` in
`packages/architecture-core/src/contracts/contract.ts` is the authority for what
counts as this layer, and it is what `npm run architecture:check` enforces.

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

- `packages/data-core/src/domains/**/index.server.ts`, `.../commands/**`
- Classifier: `packages/architecture-core/src/contracts/contract.ts`

## Related Documents

- [Repository Layer](./repository-layer.md)
- [Server Service Layer](./server-service-layer.md)

## Change Impact

New DB access needs new operation + repository method — not server service SQL.

## Invariants

Operations layer is the only layer above repository that performs persistence logic.
