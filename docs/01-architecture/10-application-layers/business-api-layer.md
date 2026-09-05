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
- Enforce camelCase for every Gova-owned JSON request and response key
- Map persistence rows and provider payloads to explicit domain DTOs before serialization

## May import

- Server service factories / bootstrap modules
- Session/auth utilities
- `@asol/*` server doors where appropriate (through services, not bypass)

## Must never import

- Client services or hooks
- Repository implementations directly (skip server service)
- Operations/instances without server service wrapper
- Client Components


## JSON transport naming contract

Gova-owned application and JSON transport fields use `camelCase` only. `snake_case` is confined to SQL, database schemas, and persistence row types owned by `@asol/data-core`, or to explicitly identified external-provider protocol adapters. Route handlers and service mirrors must not expose raw persistence rows, spread unowned provider objects, or serialize JSON directly around the contract boundary.

`@asol/api-contract-core` owns the reusable contract primitives. Root routes use the shared API response/body helpers, Web `Response` service runtimes use the contract response/body helpers, and `checkApiTransportContract` rejects direct serializers/parsers, owned snake_case keys, raw row leakage, SQL outside `data-core`, and the retired transport aliases. No recursive key converter is permitted.

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
