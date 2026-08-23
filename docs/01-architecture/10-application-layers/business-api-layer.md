# Business API Layer

## Purpose

Next.js route handlers and server entry points that receive HTTP requests and delegate to server services.

## Scope

`src/app/api/**`, server actions where used, bootstrap imports for server modules.

## Responsibilities

- Auth/session gate at boundary
- Parse and validate HTTP input
- Invoke server services — not repositories directly
- Return HTTP responses

## May import

- Server service factories / bootstrap modules
- Session/auth utilities
- `@asol/*` server doors where appropriate (through services, not bypass)

## Must never import

- Client services or hooks
- Repository implementations directly (skip server service)
- Operations/instances without server service wrapper
- Client Components

## Wiring rule

Routes import **bootstrap** server modules that wire server services — not raw query/command/repository files.

## System logs

API routes SHOULD use `runTracedBusinessRoute()` or catch + `mapServiceError()` per system-logs compliance.

## Source Map

- `src/app/api/**/route.ts` (119 routes)
- Classifier: `packages/architecture-core/src/contracts/contract.ts`

## Related Documents

- [Server Service Layer](./server-service-layer.md)
- [System logs compliance](../../06-super-admin-and-operations/super-admin-live-logs.md)

## Change Impact

Fat route handlers with SQL fail architecture scan — extract to server service path.

## Invariants

Business API is the server HTTP boundary — no DB shortcuts.
