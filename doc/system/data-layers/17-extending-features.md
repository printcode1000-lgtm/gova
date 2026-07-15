# Extending Features (Data Path)

Example: adding a `Product` feature with a new table.

## Server

1. **Entity** — `src/features/product/entities/product.entity.ts`
2. **Schema** — table in `src/core/database/` (or dedicated `.db`), `npx drizzle-kit generate`
3. **Repository** — `src/features/product/repositories/` (server-only)
4. **Operations** — `commands/`, `queries/`, `instances.ts`
5. **Server Service** — `product-service.server.ts` + `product-service.bootstrap.server.ts`
6. **API Routes** — `src/app/api/products/route.ts`

## Client

7. **Routes** — add to `ASOL_API_ROUTES`
8. **API Service** — `product-api-service.ts` using `asolApi`
9. **Client export** — `product-service.ts` re-exports adapter
10. **Query keys** — stable constants in hooks
11. **Hooks** — `useQuery` / `useMutation` + invalidation
12. **UI** — consume hooks only

## New database?

If the feature needs its own SQLite/Turso pair:

- Dedicated `*DbClient`, env vars, schema sync — see [11-current-databases.md](./11-current-databases.md)

## Contract

Run `npm run architecture:check` before PR — see [19-architecture-contract.md](./19-architecture-contract.md).

No changes to `AsolApiClient` internals required for a normal feature.
