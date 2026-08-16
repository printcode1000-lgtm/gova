# Cloudflare R2 Storage

Storage topology consists of three isolated Cloudflare R2 accounts:
- **General media account:** `8486fdbb1c87dc78481f2def0a23e043` — Bucket: `pic1` — Region: `WEUR` (avatars, covers, ads, special orders)
- **Product images account:** `166409f3b449d8f1da0dee6d25ed3e08` — Bucket: `gova-storage` — Region: `WEUR` (`PRODUCT_R2_*`)
- **OTA releases account:** `21fce63d15897aaa0b68fae1360a1810` — Bucket: `ota` — Region: `WEUR` (`ASOL_OTA_R2_*`, managed by `@asol/ota-core`)

## Env vars

See [environment variables](../../01-architecture/data-layers/14-environment-variables.md) and [R2 Storage Accounts](../../05-platform-features/r2-storage-accounts.md).

Local secrets live in `.env.local` (gitignored). Template in `.env.example`.

## Code layout

| File | Purpose |
|------|---------|
| `src/core/provisioning/r2-platform-api.ts` | Cloudflare REST — CORS get/put/delete, token verify |
| `src/core/provisioning/r2-s3-client.ts` | S3-compatible upload, delete, list, presigned URLs for general and product R2 buckets |
| `src/core/provisioning/r2-cors-policy.ts` | Default CORS rules from `ASOL_CORS_ORIGINS` |
| `src/core/config/r2-storage-topology.ts` | Canonical non-secret identity of the general, product, and OTA R2 targets |
| `scripts/r2-sync-cors.ts` | Apply full browser CORS to general and product buckets |
| `scripts/r2-sync-cors-ota.ts` | Apply full browser CORS to dedicated OTA bucket |
| `src/modules/data-access/tooling/migrate-r2-image-public-url.ts` | Copy old public R2 image URLs into the active bucket and rewrite database references |
| `src/modules/data-access/tooling/migrate-r2-cloud-folders.ts` | Move active R2 objects from legacy profile folders into the current two cloud folders |

## Sync CORS

```bash
npm run r2:sync:cors       # General and Products buckets
npm run r2:sync:cors:ota   # Dedicated OTA bucket
```

Applies `GET`, `PUT`, `POST`, `DELETE`, `HEAD` for all origins in `ASOL_CORS_ORIGINS` (defaults include `localhost:3000`).

## Public URLs

- **General Public Dev URL:** `R2_PUBLIC_URL` / `NEXT_PUBLIC_R2_PUBLIC_URL`
- **General S3 endpoint:** `R2_ENDPOINT` + bucket `pic1`
- **Product Public Dev URL:** `PRODUCT_R2_PUBLIC_URL`
- **Product S3 endpoint:** `PRODUCT_R2_ENDPOINT` + bucket `PRODUCT_R2_BUCKET_NAME`
- **OTA Public Dev URL:** `ASOL_OTA_R2_PUBLIC_URL`
- **OTA S3 endpoint:** `ASOL_OTA_R2_ENDPOINT` + bucket `ota`
- **Custom Domain:** not configured yet

## Cloud Layout

- `images/profile/...`: avatar and cover images in the general R2 bucket (`pic1`).
- `images/content/...`: home hero slider and marketplace request images in the general R2 bucket (`pic1`).
- `images/products/...`: product images in the product R2 bucket (`gova-storage`).
- `app-updates/...`: OTA release bundles, manifests, file trees, and revocations in the dedicated OTA R2 bucket (`ota`).

Local development keeps the original single root under `public/sync_data/sync_file/images/...`.

## Runtime integrity

Every cloud operation validates the configured account, endpoint, bucket, public URL, location, and jurisdiction against the canonical target before it accesses R2. A mixed configuration fails with `r2StorageTargetMismatch` instead of uploading to one bucket and persisting a URL for another.

Profile image reads also check that each object exists in its assigned storage target before returning a display URL. Deleted or stale avatar and cover references therefore resolve to `null` and do not cause browser image requests that are known to return 404.

Both complete variable groups, `R2_*` and `PRODUCT_R2_*`, must exist in every Vercel environment. Vercel variables are captured by a deployment, so changing them does not alter an already-running deployment.

## Migration

```bash
npm run r2:migrate:images
npm run r2:migrate:folders
```

The public URL migration uses `OLD_R2_PUBLIC_URL` or `R2_MIGRATION_SOURCE_PUBLIC_URL` from `.env.local`, copies referenced objects into the active bucket, and rewrites known image references in local SQLite and Turso. The folder migration moves active R2 objects from legacy profile folders into `images/profile` or `images/content`.

## Packages

- `@aws-sdk/client-s3` — S3-compatible object operations
- `@aws-sdk/s3-request-presigner` — presigned upload/download URLs

Cloudflare REST calls use `asolHttpFetch` (no extra SDK).
