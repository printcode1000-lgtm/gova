# API Client Layer (AsolApiClient)

## Purpose

The single HTTP transport boundary between client services and business API routes.

## Scope

Central HTTP client module(s) — all network I/O from browser client services flows here.

## Responsibilities

- Execute HTTP requests with consistent headers, base URL, error handling
- Abstract `NEXT_PUBLIC_ASOL_API_BASE_URL` and static-export remote API mode
- Never touch database or server-only code

## May import

- HTTP transport implementation (`asol-http-transport.ts`)
- Client-safe config (public env)
- Serialization utilities

## Must never import

- Repository, Drizzle, drivers
- Server services
- Secrets or server env vars

## Static export note

Static/mobile bundle calls remote API — local DB unavailable. Runtime context determines base URL. See [runtime-isolation.md](../06-runtime-boundaries/runtime-isolation.md).

## Source Map

- Contract ban: `fetch()` allowed only in transport module

## Related Documents

- [Client Service Layer](./client-service-layer.md)
- [Business API Layer](./business-api-layer.md)

## Change Impact

Second HTTP client duplicates CORS, auth header, and error semantics — forbidden.

## Invariants

All client-side `fetch` usage confined to approved transport module.
