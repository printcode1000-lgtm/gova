# Cloudflare R2 Storage

Storage topology consists of four isolated Cloudflare R2 accounts:
- **General media account:** `8486fdbb1c87dc78481f2def0a23e043` — Bucket: `pic1` — Region: `WEUR` (avatars, covers, ads, special orders, managed by `@asol/storage-core`)
- **Product images account (legacy):** `166409f3b449d8f1da0dee6d25ed3e08` — Bucket: `gova-storage` — Region: `WEUR` (`PRODUCT_R2_*`, managed by `@asol/storage-core`)
- **Apparel + pets product images account:** `f08cd5b705c3c57b1f65a220f7ef2642` — Bucket: `productcat1` — Region: `WEUR` (`APPAREL_PETS_R2_*`, managed by `@asol/storage-core`)
- **OTA releases account:** `21fce63d15897aaa0b68fae1360a1810` — Bucket: `ota` — Region: `WEUR` (`ASOL_OTA_R2_*`, managed by `@asol/ota-core`)

## Env vars

See [environment variables](../../02-data-and-storage/environment-variables.md) and [R2 Storage Accounts](../../05-platform-features/r2-storage-accounts.md).

Local secrets live in `.env.local` (gitignored). Template in `.env.example`.

## Code layout

| File / Package | Purpose |
|------|---------|
| `packages/storage-core/src/adapters/s3-client.adapter.ts` | Exclusive S3 adapter for `@asol/storage-core` (`@aws-sdk/client-s3`) |
| `packages/storage-core/src/server/transport/r2-platform-api.ts` | Cloudflare REST API client — CORS get/put/delete, token verify |
| `packages/storage-core/src/server/transport/r2-object-store.ts` | Account-parameterized R2 object store (upload, delete, list, download) |
| `packages/storage-core/src/server/transport/r2-cors-policy.ts` | Default CORS rules from `ASOL_CORS_ORIGINS` |
| `packages/storage-core/src/domain/accounts/account-registry.ts` | Registry holding `general`, `products`, and `products-apparel-pets` accounts (single source of truth) |
| `packages/storage-core/scripts/sync-cors.ts` | Apply full browser CORS to every `@asol/storage-core` registered bucket (`r2:sync:cors`) |
| `packages/ota-core/scripts/sync-cors.ts` | Apply full browser CORS to dedicated OTA bucket (`ota:sync:cors`) |
| `packages/data-core/src/tooling/migrate-r2-image-public-url.ts` | Copy old public R2 image URLs into active bucket and rewrite database references |
| `packages/data-core/src/tooling/migrate-r2-cloud-folders.ts` | Move active R2 objects from legacy profile folders into current cloud folders |

## Sync CORS

```bash
npm run r2:sync:cors       # General, Products, and Apparel/Pets buckets (via @asol/storage-core)
npm run ota:sync:cors      # Dedicated OTA bucket (via @asol/ota-core)
```

Applies `GET`, `PUT`, `POST`, `DELETE`, `HEAD` for all origins in `ASOL_CORS_ORIGINS` (defaults include `localhost:3000`).

## Public URLs

- **General Public Dev URL:** `R2_PUBLIC_URL` / `NEXT_PUBLIC_R2_PUBLIC_URL`
- **General S3 endpoint:** `R2_ENDPOINT` + bucket `pic1`
- **Product Public Dev URL:** `PRODUCT_R2_PUBLIC_URL`
- **Product S3 endpoint:** `PRODUCT_R2_ENDPOINT` + bucket `PRODUCT_R2_BUCKET_NAME`
- **Apparel/Pets Public Dev URL:** `APPAREL_PETS_R2_PUBLIC_URL`
- **Apparel/Pets S3 endpoint:** `APPAREL_PETS_R2_ENDPOINT` + bucket `APPAREL_PETS_R2_BUCKET_NAME`
- **OTA Public Dev URL:** `ASOL_OTA_R2_PUBLIC_URL`
- **OTA S3 endpoint:** `ASOL_OTA_R2_ENDPOINT` + bucket `ota`
- **Custom Domain:** not configured yet

## Cloud Layout

- `images/profile/...`: avatar and cover images in the general R2 bucket (`pic1`).
- `images/content/...`: home hero slider and marketplace request images in the general R2 bucket (`pic1`).
- `images/products/...`: legacy product images in the product R2 bucket (`gova-storage`).
- `images/products-apparel-pets/...`: new apparel/pets product images in the apparel-pets R2 bucket (`productcat1`).
- `app-updates/...`: OTA release bundles, manifests, file trees, and revocations in the dedicated OTA R2 bucket (`ota`).

Local development keeps the original single root under `public/sync_data/sync_file/images/...`.

## Runtime integrity

Every cloud operation validates the configured account, endpoint, bucket, public URL, location, and jurisdiction against the registered storage account definition before it accesses R2. A mixed configuration fails with `r2StorageTargetMismatch` instead of uploading to one bucket and persisting a URL for another.

Profile image reads also check that each object exists in its assigned storage target before returning a display URL. Deleted or stale avatar and cover references therefore resolve to `null` and do not cause browser image requests that are known to return 404.

Both complete variable groups `R2_*`, `PRODUCT_R2_*`, and `APPAREL_PETS_R2_*` must exist in every Vercel environment that resolves those image URLs. Vercel variables are captured by a deployment, so changing them does not alter an already-running deployment.

## Migration

```bash
npm run r2:migrate:images
npm run r2:migrate:folders
```

The public URL migration uses `OLD_R2_PUBLIC_URL` or `R2_MIGRATION_SOURCE_PUBLIC_URL` from `.env.local`, copies referenced objects into the active bucket, and rewrites known image references in local SQLite and Turso. The folder migration moves active R2 objects from legacy profile folders into `images/profile` or `images/content`.

## Packages & Isolation

- `@aws-sdk/client-s3` — S3-compatible object operations (confined to `packages/storage-core/src/adapters/s3-client.adapter.ts` and `packages/ota-core/src/publishing/adapters/r2-storage.adapter.ts`)
- `@aws-sdk/s3-request-presigner` — presigned upload/download URLs

`@asol/storage-core` and `@asol/ota-core` operate as strictly independent workspace packages with zero import edges between them.
