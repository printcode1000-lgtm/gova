# Orders Service Module

An independent deployment that serves the **order list**. It lives in
`services/orders/`, runs on its own Vercel account, and reads the nine order
shards on their own Turso account (`hesham104`).

## What is deployed

Only `services/orders/` is uploaded. Nothing else in the repository leaves the
machine.

```text
services/orders/
├── package.json          # its own dependencies, installed remotely
├── next.config.ts        # turbopack root + better-sqlite3 alias
├── tsconfig.json         # "@/*" resolves to ./generated/src/*
├── .vercelignore         # forces generated/ into the upload
├── stubs/better-sqlite3.js
├── src/
│   ├── app/lib/http.ts   # CORS + error mapping, no logging/tracing graph
│   └── app/api/
│       ├── orders/       GET   — the list
│       └── health/       GET
└── generated/            # mirrored from src/, git-ignored
```

Twenty-seven mirrored modules, which is the tightest of the three services: the
orders domain touches neither profiles nor products.

## One route, and why only one

`GET /api/orders` reads the shards and nothing else, so it moves cleanly.

Query parameters:

| Param | Default | Meaning |
|---|---|---|
| `uid`, `phone` | required | Actor identity (admin is inferred from super-admin uid/phone) |
| `limit` | `5` | Page size (max 50) |
| `offset` | `0` | Rows to skip for pagination |

The response is `{ items: [{ order, viewerRoles }], hasMore }`. Each row merges
every role the user holds on that order (buyer, seller, service_provider) so the
list no longer needs a `role` filter. Super-admin listing returns all orders with
empty `viewerRoles` and uses `role=admin` on the detail link.

The list query never joins across shards. It gathers visible `order_id` values
from `orders-core`, `orders-delivery-plans`, and `orders-fulfillment` in separate
queries, then loads and sorts matching rows from `orders-core` only.

**`GET /api/orders/<id>` stays on the main app.** The detail view enriches the
order with the buyer's and seller's profile contacts, fulfilment settings, and
store details — all in the profile shards, which this account has no credentials
for. The contract test asserts the route is absent here.

**Every write stays on the main app.** Creating an order writes across
`orders-core`, `orders-items`, and `seller_orders`, then reads the profile
shards for fulfilment settings and the product database for the authoritative
price. Splitting that across accounts would turn one operation into several that
can fail half-done, leaving an order that exists but has no items. No amount of
isolation is worth that.

## The nine shards

```text
orders-core · orders-items · orders-fulfillment · orders-delivery-plans
orders-shipping-quotes · orders-payments · orders-refunds
orders-after-sales · orders-disputes-audit
```

26 tables in total. Both accounts hold their credentials: the service to read,
the main app to write and to serve the detail view.

## How the main app reaches it

**It does not.** The deployments never call each other. The
[service bridge](service-bridge-module.md) runs in the browser and sends
`GET /api/orders` to this origin, everything else to the main app. On the server
the bridge always answers "main app", so a server-rendered request can never be
pointed here.

## Environment

| Variable | Main app | Orders service |
|---|:---:|:---:|
| The nine `ORDERS_*_DATABASE_URL` / `_AUTH_TOKEN` pairs | yes — writes and detail view | yes — the list |
| `NEXT_PUBLIC_ASOL_ORDERS_URL` | yes — client-safe | **no** — it *is* the service |
| Users, profile, product, advertisements, notifications credentials | yes | **no** |

## Deploying

```bash
npm run orders:deploy
```

The command creates the project on first run, syncs its environment variables,
mirrors the shared sources, then uploads the folder and builds remotely. The
build runs no schema sync and prerenders no pages, so it needs no database.

The project is **not connected to GitHub**. A push redeploys the main app and
changes nothing here.

## Migrating the shards

`npm run db:migrate:orders` copies rows from `LEGACY_ORDERS_*` to the current
credentials. Schema sync only applies DDL and never copies rows, so moving an
account needs this separate step. It is idempotent and verifies row counts per
table, refusing to finish on a mismatch.

## Verifying a deployment

```bash
curl https://asol-orders.vercel.app/api/health
```

Health reports how many of the nine shards are configured and names any that are
missing — a partially configured deployment answers requests but returns an
order with pieces silently absent, which is worth catching before a user does.

## Boundaries that are not accidents

| Rule | Why |
|---|---|
| The list only | The detail view needs profile data this account cannot read. |
| No writes | An order write spans nine shards plus profiles and products; splitting it invites half-created orders. |
| The bridge redirects `GET` only, in the browser only | A redirected write, or a server-side redirect, would make the accounts depend on each other. |
| `actorFromInput` lives in the orders domain, not beside the API routes | Both deployments need it, and mirroring app-router files into a service with no such routes made no sense. |
