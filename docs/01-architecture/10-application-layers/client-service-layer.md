# Client Service Layer

## Purpose

Client-side domain orchestration that prepares API calls and interprets responses — without HTTP or DB details.

## Scope

Files under a `services/` directory ending in `-api-service.ts`, or named
`auth-service.ts` / `session-service.ts`; plus
`src/features/release-commands/services/*-api-service.ts`.

No file in this repository is named `*-client-service.ts`; the classifier keys
on the suffixes above. `classifyFile` in
`packages/architecture-core/src/contracts/contract.ts` is the authority.

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

- HTTP transport: application module referenced in contract (asol-http-transport)

## Related Documents

- [API Client Layer](./api-client-layer.md)
- [Hooks Layer](./hooks-layer.md)

## Change Impact

Direct fetch in client service fails ESLint/architecture contract.

## Invariants

Single HTTP transport owner for all client services.
