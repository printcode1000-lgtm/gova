# `@asol/storage-core` Architecture & Consolidation

## 1. Summary & Core Mission

`@asol/storage-core` is the centralized, isolated workspace package managing binary and image storage for the ASOL ecosystem. Located at `packages/storage-core/`, it unifies domain models, image rules, storage profiles, key generation, server credentials, R2 account providers, S3 transport, and image processing into a single source of truth.

---

## 2. Account Inventory & Responsibilities

The ecosystem utilizes three dedicated Cloudflare R2 storage accounts:

| Account ID | Target Bucket | Environment Variable Prefix | Domain Owner | Primary Content |
| :--- | :--- | :--- | :--- | :--- |
| `general` | `pic1` | `R2_*` | `@asol/storage-core` | Application media, user avatars, store identity assets, custom request attachments. |
| `products` | `gova-storage` | `PRODUCT_R2_*` | `@asol/storage-core` | Product catalog images, category banners, promotional slider assets. |
| `ota` | `ota` | `ASOL_OTA_R2_*` | `@asol/ota-core` | Over-The-Air static update bundles, release manifests, signed update payloads. |

### Why the `ota` Account Lives in `@asol/ota-core`
The `ota` R2 account is owned exclusively by `packages/ota-core/` and deliberately kept outside `@asol/storage-core`. This separation is governed by two fundamental design principles:
1. **Security & Ownership Boundary**: The OTA system manages signed production application updates. Granting the image storage layer access to OTA bucket credentials would violate the principle of least privilege.
2. **Zero Cross-Package Dependency**: `@asol/storage-core` and `@asol/ota-core` have zero import edges between each other. Each package is independently testable and deployable.

---

## 3. Package Boundaries & Public Surface

`@asol/storage-core` exposes exactly two sealed entry points:

1. **`@asol/storage-core` (Browser / Client Door)**:
   - Safe for use in Next.js client components, browser bundles, and Web Workers.
   - **Zero Node.js builtins** (`node:fs`, `node:path`, `node:crypto`) and **zero `@aws-sdk` dependencies**.
   - Exports domain models (`StorageAccountId`, `StoredImage`, `StorageProfile`), validators (`validateStorageProfilesFile`), constants (`StorageProfiles`), image key generator, and image rules.

2. **`@asol/storage-core/server` (Server / Build Door)**:
   - Contains Node.js runtime logic, Sharp image processing, S3 client adapter, credential resolution, and provider resolution.
   - Does NOT import `server-only` to allow execution in standalone Node scripts and CLI tooling.

---

## 4. Single Source of Truth Account Registry

Account definitions are centralized in `packages/storage-core/src/domain/accounts/account-registry.ts`.
The unified provider class `R2AccountProvider` takes `accountId: StorageAccountId`. Legacy per-account functions (`uploadProductR2Object`, `deleteProductR2Object`, etc.) are completely eliminated in favor of parameterized account calls (`uploadR2Object(accountId, ...)`).

---

## 5. Worked Examples

### Worked Example A: Adding a Fourth Account (`marketing`)
To add a new storage account (e.g., `marketing` for standalone marketing assets), only data definitions change — zero modifications to providers, S3 adapters, or client components:

1. **Register account in `account-registry.ts`**:
```typescript
registerStorageAccount({
  id: 'marketing',
  accountId: '1234567890abcdef1234567890abcdef',
  endpoint: 'https://1234567890abcdef1234567890abcdef.r2.cloudflarestorage.com',
  bucketName: 'asol-marketing',
  publicUrl: 'https://pub-marketing.r2.dev',
  location: 'WEUR',
  jurisdiction: 'default',
  envPrefix: 'MARKETING_R2',
});
```
2. **Add storage profile in `storage-profiles.json`**:
```json
{
  "id": "marketingBanner",
  "enabled": true,
  "provider": "CloudflareR2_marketing",
  "folder": "images/marketing",
  "cloudFolder": "images/marketing",
  "outputFormat": "webp",
  "maxImageSizeKB": 4096
}
```
3. **Set environment variables**:
```env
MARKETING_R2_ACCESS_KEY_ID=...
MARKETING_R2_SECRET_ACCESS_KEY=...
MARKETING_R2_ENDPOINT=https://1234567890abcdef1234567890abcdef.r2.cloudflarestorage.com
MARKETING_R2_BUCKET_NAME=asol-marketing
MARKETING_R2_PUBLIC_URL=https://pub-marketing.r2.dev
MARKETING_R2_ACCOUNT_ID=1234567890abcdef1234567890abcdef
```

---

### Worked Example B: Splitting an Existing Account
If the `products` account needs to split high-resolution gallery images into a dedicated account (`product-hd`):

1. Add `product-hd` definition in `account-registry.ts`.
2. Update the `storageAccount` or `provider` field for the relevant profile in `storage-profiles.json` from `products` to `product-hd`.
3. Provide the new `PRODUCT_HD_R2_*` environment variables.
All application routes and components using the `StorageImageManager` wrapper continue working without line-of-code changes; the image manager itself lives in `@asol/storage-image-manager-core`.

---

## 6. Design Invariants & Reasoning

1. **No Cross-Account Fallbacks**:
   - *Reasoning*: Falling back from a missing account credential to another account (e.g. falling back to `general` when `products` env is missing) silently writes objects to the wrong bucket and corrupts cloud data topology. A missing environment variable MUST fail loudly naming the specific missing account.
2. **Exclusive S3 Client Ownership**:
   - *Reasoning*: Direct imports of `@aws-sdk/client-s3` in features or routes cause SDK fragmentation, duplicate connection pools, and leaked credentials. `@aws-sdk/client-s3` is strictly isolated inside `packages/storage-core/src/adapters/s3-client.adapter.ts`.
3. **CORS Policy Isolation**:
   - *Reasoning*: `@asol/storage-core` and `@asol/ota-core` define their Cloudflare CORS payload shapes locally (`CloudflareCorsRule` / `R2CorsPolicy`) to maintain zero package dependencies between them.
