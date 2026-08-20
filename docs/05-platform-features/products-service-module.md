# Products Service Module

An independent deployment that serves product **reads**. It lives in
`services/products/`, runs on its own Vercel account, and reads the product
database on its own Turso account (`hesham103`).

## What is deployed

Only `services/products/` is uploaded. Nothing else in the repository leaves the
machine.

```text
services/products/
├── package.json          # its own dependencies, installed remotely
├── next.config.ts        # turbopack root + better-sqlite3 alias
├── tsconfig.json         # "@/*" resolves to ./generated/src/*
├── .vercelignore         # forces generated/ into the upload
├── stubs/better-sqlite3.js
├── src/
│   ├── app/lib/http.ts   # CORS + error mapping, no logging/tracing graph
│   └── app/api/
│       ├── products/            GET
│       ├── products/reviews/    GET
│       ├── search/products/     GET
│       ├── search/fields/       GET
│       ├── pharmacy-profile-catalog/  GET
│       └── health/              GET
├── src/config/           # storage-profiles.json, read at runtime via fs
└── generated/            # mirrored from src/ and public/, git-ignored
```

## Reads only, and why

Creating, updating, or deleting a product also rewrites denormalised counts in
the **profiles** database — `product-repository` writes
`profile_category_product_counts`. This deployment has no profile credentials by
design, so writes stay on the main app.

The split is therefore by HTTP method, not by path: `GET /api/products` is
served here, `POST /api/products` by the main app. The contract test asserts no
route in this folder exports a write handler.

`/api/search/sellers` is also absent. Despite the name it reads the profile
shards, not products, so it belongs to the main app. Keeping it out is what let
`product-search-service.server.ts` be split into a products-only half
(`product-search-products.server.ts`) that carries no profile dependency.

## How the main app reaches it

**It does not.** The deployments never call each other.

```text
browser (service bridge)
  ├─ GET  /api/products…  ─────► products service
  └─ everything else      ─────► main app
```

The [service bridge](service-bridge-module.md) runs in the browser and decides
per request which origin should answer. On the server it always answers "main
app", so a server-rendered request can never be pointed at the products account.

## Environment

| Variable | Main app | Products service |
|---|:---:|:---:|
| `TURSO_PRODUCT_DATABASE_URL` / `_AUTH_TOKEN` | yes — writes, account deletion, data health, profile counts | yes — reads |
| `NEXT_PUBLIC_ASOL_PRODUCTS_URL` | yes — client-safe | **no** — it *is* the service |
| Users, advertisements, notifications, shard credentials | yes | **no** |
| `PRODUCT_R2_*` | yes | optional |

The main app keeps product credentials on purpose: account deletion, data
health, and the profile product counts all read that database server-side and
have nothing to do with the browser.

`PRODUCT_R2_*` is optional here. Read paths never touch image storage, but the
storage module sits in the import graph, so the values are passed when present
rather than failing obscurely if a path ever reaches them.

## Deploying

```bash
npm run products:deploy
```

The command creates the project on first run, syncs its environment variables,
mirrors the shared sources, then uploads the folder and builds remotely. The
build runs no schema sync and prerenders no pages, so it needs no database.

The project is **not connected to GitHub**. A push redeploys the main app and
changes nothing here.

## The `generated/` mirror

The service cannot import from `../../src`: only its own folder is uploaded.
`scripts/sync-products-service-sources.ts` walks the real import graph from the
route entry points and mirrors exactly the files it reaches.

Two things the notifications mirror did not need:

- **`public/` assets.** The category loader imports its JSON with a path that
  climbs out of `src/`, so `public/` is mirrored under `generated/public` to keep
  that climb resolving to the same depth.
- **Runtime assets.** `storage-profile-loader.server.ts` reads
  `packages/storage-core/src/config/storage-profiles.json` through `fs`, which an import walker cannot
  see. It is copied explicitly; without it, page-data collection fails with
  ENOENT at build time.

The contract test mirrors into a throwaway directory and compares fingerprints,
so it detects drift without repairing it.

## Verifying a deployment

```bash
curl https://asol-products.vercel.app/api/health
curl "https://asol-products.vercel.app/api/search/fields?mainCategoryId=1&subcategoryId=1"
```

## Boundaries that are not accidents

| Rule | Why |
|---|---|
| Reads only | Writes touch the profiles database, which this account cannot reach. |
| No `/api/search/sellers` | It reads profile shards, not products. |
| The bridge redirects `GET` only, in the browser only | A redirected write, or a server-side redirect, would make the two accounts depend on each other. |
| `services/` is excluded from the root `tsconfig.json` | The mirror resolves `drizzle-orm` from the service's own `node_modules`; type identity would clash if both graphs were checked together. |
