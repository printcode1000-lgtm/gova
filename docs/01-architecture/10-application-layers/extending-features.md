# Extending Features (Data Path)

## Purpose

Preserved operational and architectural detail, relocated here during the 2026-08 architecture reconstruction. Agents use this for implementation guidance.

## Scope

See sections below. Architectural relationships defer to [docs/01-architecture/README.md](../README.md) where applicable.

---

Example: adding a `Product` feature with a new table.

## Register first

Add the feature to `APPLICATION_FEATURES` in
`packages/architecture-core/src/registry/application-features-registry.ts`
with declared doors before it has architectural authority. Run
`npm run architecture:docs` after registry edits.

## Server

1. **Domain** — `src/features/product/domain/product.entity.ts`
2. **Schema** — table in `packages/data-core/src/core/database/` (or dedicated `.db`), `npm run db:drizzle -- generate`
3. **Repository** — `packages/data-core/src/domains/product/repositories/` (server-only)
4. **Operations** — `commands/`, `queries/`, `instances.ts`
5. **Server Service** — `product-service.server.ts` + `product-service.bootstrap.server.ts`
6. **API Routes** — `src/app/api/products/route.ts`
7. **Server door** — export needed symbols from `src/features/product/server.ts`

## Client

8. **Routes** — add to `ASOL_API_ROUTES`
9. **API Service** — `product-api-service.ts` using `asolApi`
10. **Client export** — `product-service.ts` re-exports adapter
11. **Query keys** — stable constants in hooks
12. **Hooks** — `useQuery` / `useMutation` + invalidation under feature hooks
13. **UI** — consume hooks only; export presentation from `ui.ts`
14. **Application door** — `index.ts` for non-UI/non-server consumers

Cross-feature imports MUST use declared doors (`@/features/product`, `/ui`, `/server`), except documented `deepImportSeams` (e.g. notifications → auth). Composition packages (`mayImportApp: true`) may deep-import feature internals to wire ports.

## New database?

If the feature needs its own SQLite/Turso pair:

- Dedicated `*DbClient`, env vars, schema sync — see [current-databases.md](../../02-data-and-storage/current-databases.md)

## Contract

Run `npm run architecture:check` before claiming done — see [layer-stack.md](./layer-stack.md).

No changes to `AsolApiClient` internals required for a normal feature.
