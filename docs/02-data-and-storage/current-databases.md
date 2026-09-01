> **Note:** Operational detail relocated here during the 2026-08 architecture reconstruction. Architectural relationships: [docs/01-architecture/](../01-architecture/README.md).

# Current Databases

ASOL uses multiple logical databases. Each domain has a local SQLite database for development and a matching Turso/libSQL database for production.

The local SQLite schema is the source of truth. Schema synchronization applies incremental DDL from local SQLite to Turso through:

```bash
npm run db:schema:sync
```

## Map

| Domain | SQLite (dev) | Turso (prod) | Database Client | Env |
| --- | --- | --- | --- | --- |
| Users and auth | `allusers.db` | Users Turso DB | `usersDataSource` | `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` |
| Products | `product.db` | Product Turso DB (separate account `hesham103`) | `productsDataSource` | `TURSO_PRODUCT_DATABASE_URL`, `TURSO_PRODUCT_AUTH_TOKEN` |
| Advertisements | `advertisements.db` | Advertisements Turso DB | `advertisementsDataSource` | `TURSO_ADVERTISEMENTS_DATABASE_URL`, `TURSO_ADVERTISEMENTS_AUTH_TOKEN` |
| Notifications | `notifications.db` | Notifications Turso DB (separate account) | `notificationsDataSource` | `TURSO_NOTIFICATIONS_DATABASE_URL`, `TURSO_NOTIFICATIONS_AUTH_TOKEN` |
| Profile shards | `profile-*.db` | Matching Turso shards (separate account `hesham105`) | `profilesDataSource` | `<SHARD>_DATABASE_URL`, `<SHARD>_DATABASE_AUTH_TOKEN` |
| System operations | `system-ops.db` | System-ops Turso shard (`hesham101`) | `profilesDataSource` | `SYSTEM_OPS_DATABASE_URL`, `SYSTEM_OPS_DATABASE_AUTH_TOKEN` |
| Marketplace order shards | `orders-*.db` | Matching Turso shards (separate account `hesham104`) | Marketplace orders DB client | `<SHARD>_DATABASE_URL`, `<SHARD>_DATABASE_AUTH_TOKEN` |

`public/sync_data/sync_sqlite/system-ops.db` is gitignored. It is generated locally by `db:ensure`, holds runtime system logs, data-health records, and release-barrier state, and must not be committed. Other shard SQLite files remain tracked as schema sources.

Logical relationships use shared IDs such as `uid`, `productId`, and `orderId`. There are no cross-file foreign keys between separate databases.

## One table, one database

No application table exists in more than one database. Verified across all 21
cloud databases on the five accounts and all 21 local runtime databases: 70
distinct tables, zero overlap.

`__drizzle_migrations` is not one of them. It is drizzle's own record of which
migrations a database has applied, so each database that runs migrations keeps
its own copy — four of them do. It holds no application data and is excluded
from the rule.

Two local files are the exception and are **not** databases the application
reads:

| File | Role |
|---|---|
| `profile.db` | schema source that `db:ensure` splits into the `profile-*` and `system-ops` shards |
| `marketplace-orders.db` | schema source that `db:ensure` splits into the `orders-*` shards |

They are build inputs. Their tables appear again in the shards by design, they
are never synced to Turso, and no runtime code opens them. Cloud copies of both
existed until they were deleted — nothing read them, and they duplicated every
shard table while holding rows the shards never received.

Adding a table means choosing exactly one database for it. If two domains need
the same data, one owns it and the other resolves it by `uid` in a second query
— see the worked example in [6. Notifications](#6-notifications).

## 1. Users and Auth

### Schema

```text
packages/data-core/src/core/database/schema.ts
```

Primary table:

- `users`
- `password_recovery_challenges`
- `feature_flags`
- `ota_releases`
- `ota_release_audit`

Notification tables are **not** here. They moved to their own database — see
[6. Notifications](#6-notifications).

### Layers

| Layer | Files |
| --- | --- |
| API | `/api/auth/*` |
| Server service | Auth server services |
| Operations | Auth queries and commands |
| Repository | User repository through `usersDataSource` |

OTA approval also uses this database through `/api/ota/access` and `/api/ota/admin/releases`. `ota_releases` stores the exact `releaseId + version`, signed-manifest snapshot, and approval/revocation metadata. `ota_release_audit` records discovery and every super-admin approval decision.

### Client

- Login and registration go through `AuthApiService`.
- Browser/client code never receives Turso credentials.
- Session data is client-side application state, not direct database access.

## 2. Profile

### Schema

```text
packages/data-core/src/core/database/profile/profile.schema.ts
packages/data-core/src/core/database/profile/user-specialties.schema.ts
```

Primary tables include:

- `user_profiles`
- `user_specialties`
- Profile reviews and profile-related settings tables

### Why they are separate

The seven shards live on their own Turso account (`hesham105`). Profile reads
back the seller directory, specialty chat, store pages and order enrichment, so
isolating them means profile traffic can never consume the quota that serves
logins or the catalogue.

`system-ops` is **not** one of them. It is split out of the same `profile.db`
source, but it holds `system_logs`, the `data_health_*` tables, and
`control_release_state` — operational records, not profile data — so it stayed
on `hesham101`.

`control_release_state` is the durable release barrier: one row per 40-character
Git SHA, holding the per-runtime deployment and smoke results the gova build
polls before it may publish. It is created by its own store on first use
(`CREATE TABLE IF NOT EXISTS`), not by `db:ensure`, because the only runtime that
touches it is `control` and the only writer is the authenticated release
callback. See
[control-runtime.md](../06-super-admin-and-operations/control-runtime.md) for
how `ready` is derived and
[release-commands.md](../07-mobile-and-release/release-commands.md) for who
writes it.

### Layers

| Layer | Files |
| --- | --- |
| API (reads) | `/api/profile/contacts`, `/api/profile/store-details`, `/api/profile/specialties`, `/api/profile/fulfillment-settings`, `/api/profile/users-by-specialty` — served by the [profiles service](../05-platform-features/profiles-service-module.md) |
| API (everything else) | the same paths on the main app, plus `/api/profile/reviews`, `/api/profile/discounts`, `/api/profile/store-images`, `/api/profile/editor` |
| Server service | Profile server services |
| Repository | Profile repositories through `profilesDataSource` |

### The rule that follows from the split

Profile **writes** go through the image storage orchestrator and touch
product-derived counts, so they cannot move to an account without those
credentials. `reviews` and `discounts` read the product database as well, so
they stayed too. The deployment boundary is by route and HTTP method, with the
browser choosing between them.

The main app keeps the shard credentials regardless — order creation reads
fulfilment settings, specialty chat resolves providers, and account deletion
clears every shard server-side.

### Notes

`user_profiles.uid` links logically to `users.uid`. Profile data is split across profile shards for core identity, contacts, media, social data, catalog indexes, promotions, and fulfillment.

## 3. Products

### Schema

```text
packages/data-core/src/core/database/product/product.schema.ts
packages/data-core/src/core/database/product/migrations
```

Primary tables include:

- `products`
- `product_reviews`
- `product_review_helpful`
- `product_review_replies`
- `pharmacy_profile_category_overrides`
- `pharmacy_profile_subcategory_overrides`
- `pharmacy_profile_product_overrides`

### Product Storage Rule

The `products` table uses explicit columns for product attributes. It does not use `data_json` or `product.data.fields`.

The only list-style product value currently stored as JSON is:

- `images_json`

See [Product Data Model](./product-data-model.md).

### Why it is separate

This database lives in its own Turso account (`hesham103`). Product reads —
catalogue listing and search — are the highest-volume queries in the system, so
isolating them means a busy catalogue can never consume the quota that serves
logins or orders.

### Layers

| Layer | Files |
| --- | --- |
| API (reads) | `/api/products`, `/api/products/reviews`, `/api/search/products`, `/api/search/fields`, `/api/pharmacy-profile-catalog` — served by the [products service](../05-platform-features/products-service-module.md) |
| API (writes) | the same paths on the main app |
| Server service | Product and pharmacy catalog services |
| Repository | Product repositories through `productsDataSource` |

### The rule that follows from the split

Product **writes** also rewrite `profile_category_product_counts` in the profile
shards, so they cannot move to an account without profile credentials. The
deployment boundary is therefore by HTTP method: reads on the products account,
writes on the main app, with the browser choosing between them.

The main app keeps product credentials regardless — account deletion, data
health, and the profile count refresh all read this database server-side.

## 4. Advertisements

### Schema

```text
packages/data-core/src/core/database/advertisements/advertisements.schema.ts
packages/data-core/src/core/database/advertisements/migrations
```

Primary tables include:

- `hero_slider`
- `featured_marquee`
- `trending_ribbon`

Featured marquee reads normalize the legacy `product_ids_json` array into the
current `{ "productIds": [...] }` config contract. Repository saves persist the
current object shape.

### Layers

| Layer | Files |
| --- | --- |
| API | `/api/advertisements/*` |
| Server service | Advertisement services |
| Repository | Advertisement repositories through `advertisementsDataSource` |

## 5. Marketplace Orders

### Schema

```text
packages/data-core/src/domains/marketplace-orders/db/migrations
```

Primary tables include:

- `orders`
- `order_items`
- `shipments`
- `shipping_quotes`
- `delivery_plans`
- `delivery_plan_stops`
- `delivery_plan_candidates`
- `delivery_plan_candidate_stops`
- `delivery_plan_quotes`
- `delivery_plan_quote_stops`
- `delivery_plan_shipments`
- `payments`
- order audit, cancellation, delivery, return, and dispute tables

### Why they are separate

The nine shards live on their own Turso account (`hesham104`), so order traffic
can never consume the quota that serves logins, profiles, or the catalogue.

### Layers

| Layer | Files |
| --- | --- |
| API (list) | `GET /api/orders` — served by the [orders service](../05-platform-features/orders-service-module.md) |
| API (detail + writes) | `GET /api/orders/:id` and every `POST` — main app |
| Module | `@asol/orders-core` (domain) · `@asol/data-core/marketplace-orders` (reads and writes) |
| Database client | Marketplace orders DB client |

### The rule that follows from the split

Only the list moved. `GET /api/orders/:id` enriches the order with profile
contacts, fulfilment settings, and store details from the profile shards, and
every write spans several order shards plus the profile and product databases —
creating an order writes `orders-core`, then `orders-items`, then
`seller_orders`. Splitting that across accounts would turn one operation into
several that can fail half-done, leaving an order with no items.

Both accounts hold the shard credentials: the service to read the list, the main
app to write and to serve the detail view.

See [Marketplace Order Management](../03-products-and-commerce/marketplace-order-management/01-architecture.md).

## 6. Notifications

### Schema

```text
packages/data-core/src/core/database/notifications/notifications.schema.ts
packages/data-core/src/core/database/notifications/migrations
```

Tables:

- `user_notification_tokens`
- `user_notification_preferences` (one account-level row containing independent specialty-request and product-conversation opt-ins; no conversation content)

Device-token rows contain transport registration only. Chat preferences are not duplicated onto tokens. The notifications database uses one pre-release baseline migration and is synchronized to its isolated Turso database from the same final SQLite schema.

The Web Push VAPID pair is not a table. Its public half is a constant in
`src/features/notifications/domain/web-push-config.ts` and its private half is
`WEB_PUSH_VAPID_PRIVATE_KEY`, matching how the Firebase and APNs credentials
are held.

### Why it is separate

This database lives in its own Turso account (`hesham102`), not alongside the
others. Push traffic — one provider request per device token — is the burstiest
workload in the system, and isolating it means it can never consume the quota
that serves logins, product pages, or orders.

### Layers

| Layer | Files |
| --- | --- |
| API | `/api/notifications/*` |
| Server service | `NotificationTokenService`, `NotificationSendService` |
| Repository | Notification repositories through `notificationsDataSource` |

### The rule that follows from the split

`user_notification_tokens.uid` links logically to `users.uid`, but the two live
in different databases on different accounts, so **nothing may JOIN them**.
`BroadcastRecipientRepository` is the worked example: it reads tokens first
because that is the narrower side, then looks up only those uids in `users` and
merges in memory. A uid with no live account is dropped, which is what the
original `innerJoin` did.

The same applies to account deletion. `deleteNotifications` runs against this
database before the user row is removed, and the two are no longer one atomic
operation — a failure leaves the account intact rather than orphaning tokens
that would keep receiving push.

## Schema Workflows

### Ensure local databases exist

```bash
npm run db:ensure
```

### Sync all configured Turso databases

```bash
npm run db:schema:sync
```

### Build

```bash
npm run build
```

The build runs schema sync before Next.js compilation.

## Adding a New Database

1. Add a local SQLite database path.
2. Add schema and migrations under `packages/data-core/src/core/database/...` or the owning module.
3. Add a database client.
4. Add Turso environment variables.
5. Add schema sync wiring.
6. Keep access inside repositories and server services.
7. Document the new database in this file.

See [20 Schema Provisioning](./schema-provisioning.md).
