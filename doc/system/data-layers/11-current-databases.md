# Current Databases

ASOL uses multiple logical databases. Each domain has a local SQLite database for development and a matching Turso/libSQL database for production.

The local SQLite schema is the source of truth. Schema synchronization applies incremental DDL from local SQLite to Turso through:

```bash
npm run db:schema:sync
```

## Map

| Domain | SQLite (dev) | Turso (prod) | Database Client | Env |
| --- | --- | --- | --- | --- |
| Users and auth | `allusers.db` | Users Turso DB | `dbClient` | `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` |
| Profile | `profile.db` | Profile Turso DB | `profileDbClient` | `TURSO_PROFILE_DATABASE_URL`, `TURSO_PROFILE_AUTH_TOKEN` |
| Products | `product.db` | Product Turso DB | `productDbClient` | `TURSO_PRODUCT_DATABASE_URL`, `TURSO_PRODUCT_AUTH_TOKEN` |
| Advertisements | `advertisements.db` | Advertisements Turso DB | `advertisementsDbClient` | `TURSO_ADVERTISEMENTS_DATABASE_URL`, `TURSO_ADVERTISEMENTS_AUTH_TOKEN` |
| Marketplace orders | `marketplace_orders.db` | Marketplace orders Turso DB | Marketplace orders DB client | `MARKETPLACE_ORDERS_DATABASE_URL`, `MARKETPLACE_ORDERS_DATABASE_AUTH_TOKEN` |

Logical relationships use shared IDs such as `uid`, `productId`, and `orderId`. There are no cross-file foreign keys between separate databases.

## 1. Users and Auth

### Schema

```text
src/core/database/schema.ts
```

Primary table:

- `users`

### Layers

| Layer | Files |
| --- | --- |
| API | `/api/auth/*` |
| Server service | Auth server services |
| Operations | Auth queries and commands |
| Repository | User repository through `dbClient` |

### Client

- Login and registration go through `AuthApiService`.
- Browser/client code never receives Turso credentials.
- Session data is client-side application state, not direct database access.

## 2. Profile

### Schema

```text
src/core/database/profile/profile.schema.ts
src/core/database/profile/user-specialties.schema.ts
```

Primary tables include:

- `user_profiles`
- `user_specialties`
- Profile reviews and profile-related settings tables

### Layers

| Layer | Files |
| --- | --- |
| API | `/api/profile/*` |
| Server service | Profile server services |
| Repository | Profile repositories through `profileDbClient` |

### Notes

`user_profiles.uid` links logically to `users.uid`. The profile database owns profile contacts, store details, fulfillment settings, specialties, and profile review data.

## 3. Products

### Schema

```text
src/core/database/product/product.schema.ts
src/core/database/product/migrations
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

See [Product Data Model](../product-data-model.md).

### Layers

| Layer | Files |
| --- | --- |
| API | `/api/products`, `/api/products/reviews*`, `/api/pharmacy-profile-catalog` |
| Server service | Product and pharmacy catalog services |
| Repository | Product repositories through `productDbClient` |

## 4. Advertisements

### Schema

```text
src/core/database/advertisements/advertisements.schema.ts
src/core/database/advertisements/migrations
```

Primary tables include:

- `hero_slider`
- `featured_marquee`
- `trending_ribbon`

### Layers

| Layer | Files |
| --- | --- |
| API | `/api/advertisements/*` |
| Server service | Advertisement services |
| Repository | Advertisement repositories through `advertisementsDbClient` |

## 5. Marketplace Orders

### Schema

```text
src/modules/marketplace-orders/db/migrations
```

Primary tables include:

- `orders`
- `order_items`
- `shipments`
- `payments`
- order audit, cancellation, delivery, return, and dispute tables

### Layers

| Layer | Files |
| --- | --- |
| API | `/api/orders*` |
| Module | `src/modules/marketplace-orders` |
| Database client | Marketplace orders DB client |

See [Marketplace Order Management](../marketplace-order-management/README.md).

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
2. Add schema and migrations under `src/core/database/...` or the owning module.
3. Add a database client.
4. Add Turso environment variables.
5. Add schema sync wiring.
6. Keep access inside repositories and server services.
7. Document the new database in this file.

See [20 Schema Provisioning](./20-schema-provisioning.md).
