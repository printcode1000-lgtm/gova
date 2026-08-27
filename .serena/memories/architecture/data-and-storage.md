# Data, Persistence, and Storage

## Database Architecture
- **Multi-Database Sharding**: Backed by Turso (production cloud) and local SQLite (development/offline).
- **ORM & Client**: Drizzle ORM configured strictly inside `@asol/data-core`.
- **Sharded Domains**:
  - `users`: Authentication, credentials, sessions, account status.
  - `products`: Product listings, catalog items, pricing, inventory.
  - `orders`: Multi-seller orders, line items, status tracking, delivery plans.
  - `profiles`: Merchant/user profiles, working hours, store details.
  - `advertisements`: Hero slider, featured marquee, trending ribbon.
  - `system_logs`: Diagnostic, audit, security events.
  - `notifications`: Push tokens, inbox history, notification logs.
- **SQL / Query Rules**: No raw SQL or Drizzle queries outside `@asol/data-core` repositories.

## Object & Media Storage
- **Provider**: Cloudflare R2 / AWS S3 API via `@asol/storage-core`.
- **Storage Profiles**: Dedicated buckets/prefixes for user uploads, product media, avatars, catalog images, and OTA release bundles.
- **Client Lifecycle**: Uploads flow through presigned URLs or managed queues via `storage-image-manager-core`.
