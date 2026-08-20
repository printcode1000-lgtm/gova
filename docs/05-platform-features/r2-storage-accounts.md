# R2 Storage Accounts

Three Cloudflare R2 accounts. One holds product images, one holds general media (avatars, covers, ads, special orders), and one holds OTA release updates.

| | General | Products | OTA Updates |
|---|---|---|---|
| Variables | `R2_*` | `PRODUCT_R2_*` | `ASOL_OTA_R2_*` |
| Account | `8486fdbb…3e043` | `166409f3…d3e08` | `21fce63d…1810` |
| Bucket | `pic1` | `gova-storage` | `ota` |
| Provider id / Target | `CloudflareR2` | `CloudflareR2Products` | `ota` (target in `R2_STORAGE_TARGETS`) |
| Public Base URL | `https://pub-91c79e3f34ed4575b997fd68ac8dd278.r2.dev` | `https://pub-e1fa9cec1a694b118840c7c2ebc1633b.r2.dev` | `https://pub-ee70bc6c84c54d9b8a8ba44c6f7820a9.r2.dev` |

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

Exactly one profile may point at the product account. The contract test asserts
that list is `["product-default"]` — not "contains", *equals*.

In development neither account is used: `resolveStorageProvider` returns
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
accounts has been eliminated; a missing value throws immediately.

## Reading an image is not an account operation

`R2_API_TOKEN`, `PRODUCT_R2_API_TOKEN`, and `ASOL_OTA_R2_API_TOKEN` are Cloudflare **account**
credentials: they create buckets and write CORS policy. Turning a key into a URL
is string work, and an existence check needs the S3 pair. Both used to go
through `getR2Config()` / `getProductR2Config()`, which demand the token — so a
read-only deployment could not resolve an avatar without holding a credential
that can reconfigure the bucket. It failed exactly that way on the profiles
account.

The read paths now take the narrow accessors:

| Need | Function | Requires |
|---|---|---|
| key → URL | `getR2PublicUrl()` / `getProductR2PublicUrl()` / `getOtaR2PublicUrl()` | the public URL |
| does it exist | `getR2S3Credentials()` / `getProductR2S3Credentials()` / `getOtaR2S3Credentials()` | the S3 pair |
| create bucket, set CORS | `getR2Config()` / `getProductR2Config()` / `getOtaR2Config()` | the API token |

Neither `asol-products` nor `asol-profiles` holds an API token.

## Keys are stored, URLs are derived

`products.images_json` used to hold `{ imageKey, url }`. The URL baked the
bucket's public hostname into every row, so moving the bucket meant rewriting
the data — which this project has already had to do once, hence
`OLD_R2_PUBLIC_URL` and `migrate-r2-image-public-url.ts`.

Rows now hold `{ imageKey }` alone. `ProductService` fills in `url` on read via
`imageStorageService.resolveImageUrl("product-default", imageKey)`, so the UI
type is unchanged and no component knows the difference. Profile images already
worked this way; the two halves now agree.

```bash
npm run db:migrate:product-image-urls
```

is idempotent and was run against both the local and Turso product databases.

## Operations & Scripts

- `npm run r2:sync:cors`: Synchronizes CORS on general (`pic1`) and product (`gova-storage`) buckets via `@asol/storage-core`.
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

1. `productDefault` is the only profile on the product account (`["productDefault"]`).
2. No line naming an `ASOL_OTA_R2_*` variable names any other `*_R2_*` credential — ensuring zero fallbacks across account boundaries.
3. No existence check or URL resolution reaches for the full config (narrow accessors only).
4. `images_json` is written as keys via `@asol/product-core/server` (`serializeProductImages`), and — the half that fails silently — is *read* without requiring a stored `url` (`parseProductImages`). A parser still demanding one drops every migrated row and the product renders with no images at all.
5. `R2_STORAGE_TARGETS` contains exactly three distinct isolated targets (`general`, `products`, `ota`) with non-overlapping account IDs, endpoints, bucket names, and public URLs.
6. No reference to `ASOL_OTA_LEGACY_R2_` anywhere in `packages/ota-core/src`, `src`, or `scripts`.

## Separation resolved

The previous limitation of OTA sharing the general account with profile images has been fully resolved: OTA now has its own dedicated Cloudflare account (`21fce63d…1810`) and bucket (`ota`). 50 MB of build artefacts and transport archives no longer sit beside 20 KB avatars.

See [Environment Variables](../01-architecture/data-layers/14-environment-variables.md).
