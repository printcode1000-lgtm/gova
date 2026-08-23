# Client Service Layer

## Purpose

Client-side domain orchestration that prepares API calls and interprets responses — without HTTP or DB details.

## Scope

`*-client-service.ts`, feature services consumed by hooks under `src/features/`.

## Responsibilities

- Map UI/hook inputs to API request shapes
- Call AsolApiClient (not raw fetch)
- Handle client-side error translation for display

## May import

- AsolApiClient / feature API modules
- Shared client utilities
- Browser-safe `@asol/*` types and helpers

## Must never import

- `fetch`, axios, XHR directly (use transport layer)
- SQL, repository, operations
- Server services or route handlers

## Source Map

- Backup: `docs/01-architecture-backup/data-layers/03-client-service-layer.md`
- HTTP transport: application module referenced in contract (asol-http-transport)

## Related Documents

- [API Client Layer](./api-client-layer.md)
- [Hooks Layer](./hooks-layer.md)

## Change Impact

Direct fetch in client service fails ESLint/architecture contract.

## Invariants

Single HTTP transport owner for all client services.
