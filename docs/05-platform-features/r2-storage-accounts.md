# R2 Storage Accounts

Four Cloudflare R2 accounts under the media/OTA topology: general media, legacy
product images, apparel/pets product images, and OTA release updates.

| | General | Products (legacy) | Apparel + Pets | OTA Updates |
|---|---|---|---|---|
| Variables | `R2_*` | `PRODUCT_R2_*` | `APPAREL_PETS_R2_*` | `ASOL_OTA_R2_*` |
| Account | `8486fdbb…3e043` | `166409f3…d3e08` | `f08cd5b7…f2642` | `21fce63d…1810` |
| Email | `print.code.1000@gmail.com` | `bids.stories@gmail.com` | `hesham.gaber@gmail.com` | `tenderx.engineer100@gmail.com` |
| Bucket | `pic1` | `gova-storage` | `productcat1` | `ota` |
| Provider id / Target | `CloudflareR2` | `CloudflareR2Products` | `CloudflareR2_products-apparel-pets` | `ota` (target in `R2_STORAGE_TARGETS`) |
| Public Base URL | `https://pub-91c79e3f34ed4575b997fd68ac8dd278.r2.dev` | `https://pub-e1fa9cec1a694b118840c7c2ebc1633b.r2.dev` | `https://pub-de6cc53c347e4e6fa0dea7b79bd0ce3e.r2.dev` | `https://pub-ee70bc6c84c54d9b8a8ba44c6f7820a9.r2.dev` |

## What decides where a file goes

`packages/storage-core/src/config/storage-profiles.json`, and nothing else. Each profile names its
provider, and the provider names the account:

| Profile | Account | Cloud folder |
|---|---|---|
| `avatar` | general | `images/profile/avatars` |
| `cover` | general | `images/profile/covers` |
| `home-hero-slider` | general | `images/content/advertisements/home-hero-slider` |
| `spicialOrder` | general | `images/content/spicialOrder` |
| `product-default` | **products** | `images/products` |
| `product-apparel-pets` | **products-apparel-pets** | `images/products-apparel-pets` |

Exactly one profile may point at each product account. The contract test asserts
those lists equal `["product-default"]` and `["product-apparel-pets"]` respectively.

### Product category routing

New product uploads choose a profile via
`resolveProductStorageProfileId(scope)` from `@asol/storage-core`:

| Scope | Profile |
|---|---|
| Catalog main-category ids `1` (apparel/fashion) and `12` (pets) | `product-apparel-pets` |
| Onboarding fashion slugs (`bags`, `casual`, `formal`, `jewelry`, `custom`, …) | `product-apparel-pets` |
| Every other scope | `product-default` |

`products.images_json` stores `{ imageKey }` and, when the upload is not on
`product-default`, an optional `storageProfileId`. **Absence of
`storageProfileId` means `product-default`** — legacy rows for categories 1 and
12 stay on the old `gova-storage` bucket with no object migration.

In development neither media account is used: `resolveStorageProvider` returns
`LocalStorage` regardless of the profile.

OTA release storage never uses `storage-profiles.json`. It is managed exclusively
by `@asol/ota-core` via `ASOL_OTA_R2_*` targeting the dedicated `ota` bucket under
`app-updates/`.

## The fallback that broke it

The separation existed in the code from the start and was not true in practice.
An audit of the live buckets found:

| Products bucket, before | Objects | Size |
|---|---:|---:|
| OTA release artefacts | 3,463 | 50.20 MB |
| Product images | 1 | 0.03 MB |
| Profile images orphaned by an earlier migration | 5 | 0.11 MB |

The account meant for product images was 99.8% not product images.

The cause was a chain in the OTA publisher:

```text
ASOL_OTA_R2_ENDPOINT  →  PRODUCT_R2_ENDPOINT  →  R2_ENDPOINT
```

No `ASOL_OTA_R2_*` was configured, so every release landed on the product
account. **A fallback that crosses an account boundary is not a default — it is
a silent redirect.** A missing value should stop the run; instead it wrote
somewhere else and nothing looked wrong.

OTA now reads `ASOL_OTA_R2_*` and nothing else. Every fallback chain across
accounts has been eliminated; a missing value throws immediately. The same rule
applies to `APPAREL_PETS_R2_*`: missing values fail loudly and never fall back to
`PRODUCT_R2_*` or `R2_*`.

## Reading an image is not an account operation

`R2_API_TOKEN`, `PRODUCT_R2_API_TOKEN`, `APPAREL_PETS_R2_API_TOKEN`, and
`ASOL_OTA_R2_API_TOKEN` are Cloudflare **account** credentials: they create
buckets and write CORS policy. Turning a key into a URL is string work, and an
existence check needs the S3 pair. Both used to go through full config helpers
that demand the token — so a read-only deployment could not resolve an avatar
without holding a credential that can reconfigure the bucket.

The read paths now take the narrow accessors (public URL / S3 pair) per account.
Neither `asol-products` nor `asol-profiles` holds an API token. `asol-products`
does receive `APPAREL_PETS_R2_*` public/S3 keys so apparel/pets image URLs resolve.

## Keys are stored, URLs are derived

`products.images_json` holds `{ imageKey }` and optionally `storageProfileId`.
The URL is never persisted. `ProductService` fills in `url` on read via
`imageStorageService.resolveImageUrl(profileId, imageKey)`, where `profileId` is
the stored `storageProfileId` or `product-default` when omitted.

```bash
npm run db:migrate:product-image-urls
```

is idempotent and preserves optional `storageProfileId` while stripping absolute
URLs.

## Operations & Scripts

- `npm run r2:sync:cors`: Synchronizes CORS on general (`pic1`), product
  (`gova-storage`), and apparel-pets (`productcat1`) buckets via `@asol/storage-core`
  (all registered storage accounts).
- `npm run ota:sync:cors`: Synchronizes CORS on the **dedicated OTA account (`ota`)** via `@asol/ota-core`.
- `npm run test:r2-storage`: Asserts non-secret target topology and profile alignment.
- `npm run test:storage-core`: Runs offline static architecture contract checks and account separation tests.
- `npm run ota:publish -- --confirm-upload --minimum-native-version=<version>`: Builds, signs, and uploads release artefacts to the dedicated OTA account.
- `npm run ota:status`: Reads live manifest status from the dedicated OTA account.

## Enforcement

```bash
npm run test:storage-core
```

`packages/storage-core/src/tests/r2-account-separation.test.ts` asserts, offline:

1. Exactly one profile per product account (`product-default`, `product-apparel-pets`).
2. No line naming an `ASOL_OTA_R2_*` variable names any other `*_R2_*` credential — ensuring zero fallbacks across account boundaries.
3. No existence check or URL resolution reaches for the full config (narrow accessors only).
4. `images_json` is written as keys (+ optional `storageProfileId`) via `@asol/product-core/server`, and is *read* without requiring a stored `url`.
5. The three media accounts (`general`, `products`, `products-apparel-pets`) have non-overlapping account IDs, endpoints, bucket names, public URLs, and env prefixes.
6. No reference to `ASOL_OTA_LEGACY_R2_` anywhere in `packages/ota-core/src`, `src`, or `scripts`.

See [Environment Variables](../01-architecture/data-layers/14-environment-variables.md).
