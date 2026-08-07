# R2 Storage Accounts

Two Cloudflare R2 accounts. One holds product images. The other holds
everything else.

| | General | Products |
|---|---|---|
| Variables | `R2_*` | `PRODUCT_R2_*` |
| Account | `8486fdbb…3e043` | `166409f3…d3e08` |
| Bucket | `pic1` | `gova-storage` |
| Provider id | `CloudflareR2` | `CloudflareR2Products` |

## What decides where a file goes

`src/config/storage-profiles.json`, and nothing else. Each profile names its
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

OTA now reads `ASOL_OTA_R2_*` and nothing else, in `scripts/ota/ota-r2.ts`,
`scripts/ota/ota-config.ts`, and `getOtaApprovalServerConfig`. A missing value
throws. The 3,468 foreign objects were deleted; the bucket holds one object,
which is the product image.

## Reading an image is not an account operation

`R2_API_TOKEN` and `PRODUCT_R2_API_TOKEN` are Cloudflare **account**
credentials: they create buckets and write CORS policy. Turning a key into a URL
is string work, and an existence check needs the S3 pair. Both used to go
through `getR2Config()` / `getProductR2Config()`, which demand the token — so a
read-only deployment could not resolve an avatar without holding a credential
that can reconfigure the bucket. It failed exactly that way on the profiles
account.

The read paths now take the narrow accessors:

| Need | Function | Requires |
|---|---|---|
| key → URL | `getR2PublicUrl()` / `getProductR2PublicUrl()` | the public URL |
| does it exist | `getR2S3Credentials()` / `getProductR2S3Credentials()` | the S3 pair |
| create bucket, set CORS | `getR2Config()` / `getProductR2Config()` | the API token |

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

## Enforcement

```bash
npm run test:r2-separation
```

`src/core/storage/tests/r2-account-separation.test.ts` asserts, offline:

1. `product-default` is the only profile on the product account.
2. No line naming an `ASOL_OTA_R2_*` variable names any other `*_R2_*` one —
   stated as a rule, not a blocklist, so a credential added later is covered.
3. No existence check or URL resolution reaches for the full config.
4. `images_json` is written as keys, and — the half that fails silently — is
   *read* without requiring a `url`. A parser still demanding one drops every
   migrated row and the product renders with no images at all.

## The one exception on the product bucket

Two documents — `app-updates/manifest.json` and `app-updates/revocations.json`
— are mirrored onto the product bucket on purpose, and they are the only
non-product objects allowed there.

The manifest URL is inlined into the web bundle at build time, so the Android
shell installed from the store still asks the old origin. Deleting the OTA
objects left it with a 404. The mirror is two small JSON files, not a release:
every file and bundle still downloads from the general account, because the
client takes those URLs from the manifest's own `baseUrl`.

It is temporary, but not short-lived: it stays until a store build against the
new origin has rolled out. A device only stops needing it after it *installs* a
bundle carrying the new URL, and installing also requires approval and rollout
eligibility — removing the mirror before then returns every store-installed
shell to a 404. `ota:publish` refreshes it automatically. See
[Moving the OTA origin](../07-mobile-and-release/capacitor/ota-update-system.md#moving-the-ota-origin).

## Known limitation

OTA now shares the general account with profile and content images. That is
correct in the sense that the product account is clean, but 50 MB of build
artefacts still sits beside 20 KB avatars. A third account, or a second bucket
on the general one, would separate them properly. The variables are already
explicit, so that move is a configuration change and a re-publish.

See [Environment Variables](../01-architecture/data-layers/14-environment-variables.md).
