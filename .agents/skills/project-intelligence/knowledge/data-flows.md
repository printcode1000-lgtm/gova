# Data Flows & Storage Topology

## Multi-Database Sharding Architecture

The repository employs a multi-database sharding strategy powered by **Drizzle ORM** with dual-driver support (`better-sqlite3` for local development and `@libsql/client` for Turso cloud production).

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                            DATABASE TOPOLOGY                                │
├───────────────────────────────┬─────────────────────────────────────────────┤
│ Domain Shard Group            │ Databases / Shards                          │
├───────────────────────────────┼─────────────────────────────────────────────┤
│ Primary Authentication        │ gova-users (users, sessions, credentials)   │
│ Standalone Products           │ gova-products (catalog items, reviews)      │
│ Standalone Notifications      │ gova-notifications (tokens, delivery logs)  │
│ Standalone Advertisements     │ gova-advertisements (sliders, marquees)     │
│ Profile Shards (8 shards)     │ profile-core, profile-contact,              │
│                               │ profile-media, profile-social,              │
│                               │ profile-catalog, profile-promotions,        │
│                               │ profile-fulfillment, system-ops             │
│ Marketplace Orders (9 shards) │ orders-core, orders-items,                  │
│                               │ orders-fulfillment, orders-delivery-plans,  │
│                               │ orders-shipping-quotes, orders-payments,    │
│                               │ orders-refunds, orders-after-sales,         │
│                               │ orders-disputes-audit                       │
└───────────────────────────────┴─────────────────────────────────────────────┘
```

---

## Inode-Aware SQLite Connection Caching (`CachedSqliteConnection`)

In local development with `better-sqlite3`, connections are wrapped with `CachedSqliteConnection` (`packages/data-core/src/core/database/cached-sqlite-connection.ts`).

- **Problem solved**: Rebuilding a local database (`db:create:*`, cloud restore, or shard split) unlinks the SQLite file and places a new inode at the same path. An unmanaged cached handle remains bound to the unlinked inode, causing stale reads and failing all subsequent writes with `SQLITE_READONLY: attempt to write a readonly database` until the Next.js dev server restarts.
- **Solution**: `readSqliteFileIdentity(databasePath)` reads the OS filesystem device/inode pair (`${stats.dev}:${stats.ino}`). When a rebuild changes the inode, `CachedSqliteConnection` automatically closes the orphaned handle and establishes a clean connection on the next query with zero downtime.

---

## Data Transformation & Persistence Lifecycle

### 1. User & Authentication Data
- **Origin**: Client registration / login forms.
- **Transformation**: Password hashed with PBKDF2/scrypt (`@asol/auth-core`), phone numbers normalized to E.164.
- **Storage**: `users` database table in `gova-users` Turso shard.
- **Read Path**: Verified on every authenticated request via session cookie token verification.

### 2. Products & Inventory Data
- **Origin**: Merchant product creation form via `@asol/page-save-core`.
- **Transformation**: Validated against catalog category rules (`@asol/catalog-core`), prices normalized to integer cents, style metadata generated (`@asol/product-style-core`).
- **Write Path**: `POST /api/products` routed to `asol-sub2main` → writes to `gova-products` shard + increments merchant product counter on `gova-profiles`.
- **Read Path**: High-frequency reads routed to `asol-products` service (`GET /api/products`) with TanStack Query client caching.

### 3. Orders & Marketplace Transactions
- **Origin**: Buyer checkout submission.
- **Transformation**: Multi-seller splitting, shipping quotes calculated, promo codes validated (`seller-discounts`).
- **Write Path**: `POST /api/orders/from-cart` routed to `asol-submain` → creates master order & sub-orders in `orders-core` and child shards.
- **Read Path**: Order listing (`GET /api/orders`) served by `asol-orders` service; individual order enrichment (`GET /api/orders/:id`) served by `gova` main.

### 4. Push Notification Tokens & Inbox
- **Origin**: Mobile app startup / Web Push subscription.
- **Transformation**: Token categorized by kind (`fcm`, `apns`, `web_push`), device metadata attached, duplicates pruned.
- **Storage**: Stored in `gova-notifications` Turso shard.
- **Read/Delivery Path**: `asol-notifications` service reads tokens during dispatch and writes delivery status logs.

### 5. UiRegistry Pending Requests
- **Origin**: Super-admin element inspector ("Add to UiRegistry").
- **Transformation**: Validated against `UI_PAGE_REGISTRY` membership and Base62 UID format. PII and raw values stripped.
- **Storage**: Stored in `ui_registry_pending_requests` table in `system-ops` shard.
- **Resolution**: Applied to source code via `npm run ui-registry:apply-pending` and checked before release via `npm run ui-registry:pending:check`.

---

## Object Storage Hierarchy (Cloudflare R2)

Managed exclusively through `@asol/storage-core` using S3-compatible APIs:

```text
r2://gova-storage-bucket/
├── products/
│   └── {seller_uid}/{product_id}/{image_hash}.webp
├── profiles/
│   └── {user_uid}/avatar_{hash}.webp
├── banners/
│   └── hero/{slide_id}_{hash}.webp
├── system/
│   └── crash-reports/{date}/{report_id}.json
└── ota/
    ├── manifests/ota-manifest.json
    └── releases/v{version}-{build_number}.zip
```

### Storage Profiles Policy
- Every upload category is bound to a validated **Storage Profile** (`packages/storage-core/src/profiles/`).
- Validates allowed MIME types, max file sizes, and public CDN URL patterns.
- Validated via `npm run validate-storage-profiles`.

---

## Client State Caching & Synchronization

| Client Store | Purpose | Invalidation Strategy |
|---|---|---|
| **TanStack Query (React Query)** | Server entity caching (products, profiles, orders, cart) | Query key invalidation on mutation + TTL background refetch |
| **AsolDB (Browser IndexedDB)** | Offline persistence for unsaved page writes (`PAGE_SAVE_PENDING`) and crash recovery log (`PAGE_SAVE_JOURNAL`) (DB v11) | Explicit write completion, form reset, or journal acknowledgement |
| **Zustand Stores** | Global UI state (theme, sidebar open, modal states, network status) | Component unmount / explicit reset action |
| **Capacitor Preferences / LocalStorage** | User session tokens, notification inbox cache, favorites list | Explicit user logout / app factory reset |
| **Page Save Journal** | In-flight unsaved form drafts | Cleared upon confirmed server 200 OK |
| **UiRegistry Pending Queue** | Unresolved diagnostic element registration requests | Resolved upon `ui-registry:apply-pending` source write |
