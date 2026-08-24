# Image Storage System

Profile-driven multi-provider architecture. The UI passes only **storage profile ids** via `StorageProfiles.*` — never provider names, folders, or size limits.

## Contract

| Profile                          | Max KB | Format | Local folder                             | R2 cloud folder                                  |
| -------------------------------- | ------ | ------ | ---------------------------------------- | ------------------------------------------------ |
| `StorageProfiles.Avatar`         | 20     | webp   | `images/avatars`                         | `images/profile/avatars`                         |
| `StorageProfiles.Cover`          | 30     | webp   | `images/covers`                          | `images/profile/covers`                          |
| `StorageProfiles.ProductDefault` | 30     | webp   | `images/products/<mainCategoryId>`       | `images/products/<mainCategoryId>` in the legacy product R2 bucket (`gova-storage`) |
| `StorageProfiles.ProductApparelPets` | 30 | webp | `images/products-apparel-pets/<scope>` | `images/products-apparel-pets/<scope>` in the apparel-pets R2 bucket (`productcat1`) |
| `StorageProfiles.HomeHeroSlider` | 1024   | webp   | `images/advertisements/home-hero-slider` | `images/content/advertisements/home-hero-slider` |
| `StorageProfiles.SpicialOrder`   | 500    | webp   | `images/spicialOrder`                    | `images/content/spicialOrder`                    |

Config: `packages/storage-core/src/config/storage-profiles.json` (server-only).

## Pipeline

```
UI → ImageStorageService → API
       ↳ compress (Canvas, profile-driven)

Server: Storage Profile → Provider → Persistence
```

**Development** (`NODE_ENV=development`): `LocalStorageProvider` → paths from `@asol/dev-core` under `public/sync_data/sync_file/images/...`

**Production / Capacitor / static**: profile provider (Cloudflare R2). The general R2 bucket uses `images/profile/...` for avatar/cover and `images/content/...` for advertisements and order images. Product images use dedicated product R2 accounts: legacy `product-default` under `images/products/...` on `gova-storage`, and new apparel/pets uploads under `images/products-apparel-pets/...` on `productcat1`.

Callers pass a semantic `storageScope` (catalog main-category id, or an onboarding fashion slug). `resolveProductStorageProfileId(scope)` from `@asol/storage-core` selects `product-apparel-pets` for catalog ids `1` and `12` and all onboarding fashion slugs; every other scope stays on `product-default`. Persisted `images_json` entries may include `storageProfileId`; when omitted, readers treat the object as `product-default` so pre-split apparel/pets rows keep working without migration.

`product-default` and `product-apparel-pets` are each the **only** profile on their product account, and
`npm run test:storage-core` asserts those lists exactly — see
[R2 Storage Accounts](../../05-platform-features/r2-storage-accounts.md).

`StorageImageManager` performs no provider write during selection or preview preparation. Before a selected preview becomes visible, its `Blob` and metadata are committed to the `imageUploadDrafts` AsolDB store. Upload starts only after the user presses Upload and confirms the localized application dialog. Removal calls the DELETE API and waits for provider success before clearing the UI value.

Product creation and unified profile saving are commit boundaries. If a user has selected images but has not pressed the per-image upload control, the commit asks every visible image manager to upload its pending draft, waits for the FIFO queue, and saves data only after every upload succeeds. A failed image blocks the commit and remains locally available for retry. Clicking an empty image card does nothing; the source menu opens only from its explicit **Add image** text action.

## Upload queue

All `StorageImageManager` instances share the FIFO queue in
`packages/storage-image-manager-core/src/services/image-upload-queue.ts`. The queue processes one
complete image pipeline at a time (profile lookup, compression, upload, and
finalization), updates waiting positions, prevents duplicate requests for the
same manager slot and file, and continues after an item fails. A queued item can
be cancelled before it starts. Every item is mirrored by
`image-upload-draft-service.ts` in IndexedDB, so its preview and durable state
survive navigation. A queued or active draft whose in-memory task disappeared
after a full reload is re-enqueued automatically. Successful drafts are removed
after the uploaded image is delivered to the owning feature; failed drafts stay
available for retry while the next queue item continues. Logout aborts the
in-memory queue and clears every image draft on Web, Android, and iOS.

`product-default` and `product-apparel-pets` declare `folderStrategy: "main-category"`. Their local/cloud base folders are `images/products` and `images/products-apparel-pets` respectively (distinct on purpose so `referenceFromObjectPath` can reverse path → profile unambiguously). Callers provide only a validated scope id as `storageScope`. The server creates `<scope>/<uuid>.webp` as the image key, so upload, URL resolution, replacement, and deletion all address the correct provider object without exposing folder construction to the UI.

## Layers

| Layer               | Location                                                        |
| ------------------- | --------------------------------------------------------------- |
| Profiles            | `packages/storage-core/src/domain/profiles/`                    |
| ImageKeyGenerator   | `packages/storage-core/src/domain/images/image-key-generator.ts` |
| Rules               | `packages/storage-core/src/domain/images/image-rules.ts`       |
| Processing (Canvas) | `packages/storage-image-manager-core/src/processing/`           |
| Providers           | `packages/storage-core/src/server/providers/`                  |
| Orchestrator        | `packages/storage-core/src/server/storage/`                    |
| **Client service**  | `packages/storage-image-manager-core/src/services/image-storage-service.ts` |
| Draft persistence   | `packages/storage-image-manager-core/src/services/image-upload-draft-service.ts` |
| API adapter         | `src/features/storage/application/services/image-storage-api-service.ts`    |
| App wiring          | `src/features/storage/presentation/StorageImageManager.tsx` and service shims |
| Hook                | `packages/storage-image-manager-core/src/hooks/use-storage-profile-upload.ts` |
| UI                  | `packages/storage-image-manager-core/src/components/StorageImageManager.tsx` |

## APIs

| Method  | Route                                             | Response                                                                |
| ------- | ------------------------------------------------- | ----------------------------------------------------------------------- |
| GET     | `/api/storage/profiles/:id`                       | Full client profile (`id`, `maxImageSizeKB`, `outputFormat`, `enabled`) |
| POST    | `/api/storage/images/upload`                      | Upload WebP (multipart)                                                 |
| DELETE  | `/api/storage/images/:imageKey?storageProfileId=` | Delete                                                                  |
| GET/PUT | `/api/profile/store-images`                       | Persist avatar/cover keys                                               |

## Client profile example

```json
{
  "id": "avatar",
  "maxImageSizeKB": 20,
  "outputFormat": "webp",
  "enabled": true
}
```

## Storage profile ids

Use constants — never string literals in pages:

```typescript
import { StorageProfiles } from "@asol/storage-core";

StorageProfiles.Avatar;
StorageProfiles.Cover;
StorageProfiles.ProductDefault;
StorageProfiles.ProductApparelPets;
StorageProfiles.SpicialOrder;
```

Prefer `resolveProductStorageProfileId(scope)` over hard-coding a product profile
when the upload belongs to a product category or onboarding fashion slug.

## Persistence

Profile logo and storefront references are canonical rows in `profile_images` (`image_type`, `image_key`, `sort_order`). Product references remain in the product record's validated image collection.

Any feature (Onboarding, Dashboard, Admin) uses `resolveProductStorageProfileId` + `StoredImage` (which may carry `storageProfileId`) — not onboarding-specific types.

## ImageKey

Generated only via `ImageKeyGenerator` → `{uuid}.webp`. Folder from storage profile.

## Local layout

```
public/sync_data/sync_file/
  images/
    avatars/
    covers/
    advertisements/home-hero-slider/
    products/<mainCategoryId>/
    products-apparel-pets/<scope>/
    spicialOrder/
```

See also [r2-storage.md](./r2-storage.md).

`shouldUseUnoptimizedImage` in `@asol/storage-core` bypasses the Next.js optimizer for `blob:` and `data:` previews, local `/sync_data/sync_file/` URLs, and listed CDN hosts (`r2.dev`, `cloudflarestorage.com`, `googleusercontent.com`).
