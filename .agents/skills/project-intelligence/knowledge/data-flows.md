# Data Flows & Storage Topology

## Multi-Database Sharding Architecture

The repository employs a multi-database sharding strategy powered by **Drizzle ORM** with dual-driver support (`better-sqlite3` for local development and `@libsql/client` for Turso cloud production).

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                            DATABASE TOPOLOGY                                │
├───────────────────────────────┬─────────────────────────────────────────────┤
│ Domain Shard                  │ Owning Vercel Account / Database Host       │
├───────────────────────────────┼─────────────────────────────────────────────┤
│ Users & Auth                  │ hesham-101 (Turso: gova-users)              │
│ Products & Catalog            │ gnagnahesham (Turso: gova-products)         │
│ Orders & Delivery             │ tenderx10 (Turso: gova-orders)              │
│ Merchant Profiles & Reviews   │ hesham10125 (Turso: gova-profiles)          │
│ Push Notifications & Tokens   │ 101-0902 (Turso: gova-notifications)        │
│ Advertisements & Banners      │ hesham-101 (Turso: gova-advertisements)     │
│ System Logs & Telemetry       │ hesham-101 (Turso: gova-system-logs)        │
└───────────────────────────────┴─────────────────────────────────────────────┘
```

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
- **Write Path**: `POST /api/products` on `gova` main server → writes to `gova-products` shard + increments merchant product counter on `gova-profiles`.
- **Read Path**: High-frequency reads routed to `asol-products` service (`GET /api/products`) with TanStack Query client caching.

### 3. Orders & Marketplace Transactions
- **Origin**: Buyer checkout submission.
- **Transformation**: Multi-seller splitting, shipping quotes calculated, promo codes validated (`seller-discounts`).
- **Write Path**: `POST /api/orders` on `gova` main server → creates master order & sub-orders in `gova-orders` shard.
- **Read Path**: Order listing (`GET /api/orders`) served by `asol-orders` service; individual order enrichment (`GET /api/orders/:id`) served by `gova` main.

### 4. Push Notification Tokens & Inbox
- **Origin**: Mobile app startup / Web Push subscription.
- **Transformation**: Token categorized by kind (`fcm`, `apns`, `web_push`), device metadata attached, duplicates pruned.
- **Storage**: Stored in `gova-notifications` Turso shard.
- **Read/Delivery Path**: `asol-notifications` service reads tokens during dispatch and writes delivery status logs.

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
| **Zustand Stores** | Global UI state (theme, sidebar open, modal states, network status) | Component unmount / explicit reset action |
| **Capacitor Preferences / LocalStorage** | User session tokens, notification inbox cache, favorites list | Explicit user logout / app factory reset |
| **Page Save Journal** | In-flight unsaved form drafts | Cleared upon confirmed server 200 OK |
