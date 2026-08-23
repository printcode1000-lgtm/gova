# Server Service Layer

## Purpose

Server-side orchestration coordinating query/command operations and enforcing server domain policy.

## Scope

`*-service.server.ts`, feature server services under `src/features/**/services/`.

## Responsibilities

- Transaction boundaries and domain policy at server
- Call query/command layer — not repository directly
- Compose `@asol/*` server capabilities (orders-core, notifications-core, etc.)

## May import

- Query/command modules (operations layer)
- Other server services (careful — avoid cycles)
- `@asol/*` `./server` doors
- Server config (`src/core/config`)

## Must never import

- UI, hooks, client services
- Repository concrete classes directly (bypass operations)
- Drizzle schema construction outside allowed paths
- Client Components

## Package integration

Server services wire ports registered in `src/core/composition/server-ports.ts`. Example: order super-admin identity via `registerOrdersCorePorts()`.

## Source Map

- Backup: `docs/01-architecture-backup/data-layers/06-server-service-layer.md`

## Related Documents

- [Operations Layer](./operations-layer.md)
- [Composition Roots](../04-composition/composition-roots.md)

## Change Impact

Server service importing repository directly bypasses operations layer — fails contract.

## Invariants

Server services sit between business API and operations layer exclusively.
