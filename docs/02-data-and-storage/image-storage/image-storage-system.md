# Image Storage System

Profile-driven multi-provider architecture. The UI passes only **storage profile ids** via `StorageProfiles.*` — never provider names, folders, or size limits.

## Contract

| Profile                          | Max KB | Format | Local folder                             | R2 cloud folder                                  |
| -------------------------------- | ------ | ------ | ---------------------------------------- | ------------------------------------------------ |
| `StorageProfiles.Avatar`         | 20     | webp   | `images/avatars`                         | `images/profile/avatars`                         |
| `StorageProfiles.Cover`          | 30     | webp   | `images/covers`                          | `images/profile/covers`                          |
| `StorageProfiles.ProductDefault` | 30     | webp   | `images/products/<mainCategoryId>`       | `images/products/<mainCategoryId>` in the legacy product R2 bucket |
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

**Production / Capacitor / static**: profile provider (Cloudflare R2). The general R2 bucket uses `images/profile/...` for avatar/cover and `images/content/...` for advertisements and order images. Product images use the separate product R2 account under `images/products/...`.

`ProductDefault` is the **only** profile on the product account, and
`npm run test:storage-core` asserts that list equals exactly that — the
separation held in the code while being untrue in the live bucket for a long
time. See [R2 Storage Accounts](../../05-platform-features/r2-storage-accounts.md).

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

`product-default` declares `folderStrategy: "main-category"`. Its local base folder is `images/products`, and its cloud base folder remains `images/products` on the product R2 account (`gova-storage`); callers provide only a validated main-category ID as `storageScope`. The server creates `<mainCategoryId>/<uuid>.webp` as the image key, so upload, URL resolution, replacement, and deletion all address the correct provider object without exposing folder construction to the UI.

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
| API adapter         | `src/features/storage/services/image-storage-api-service.ts`    |
| App wiring          | `src/features/storage/components/StorageImageManager.tsx` and service shims |
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
StorageProfiles.SpicialOrder;
```

## Persistence

Profile logo and storefront references are canonical rows in `profile_images` (`image_type`, `image_key`, `sort_order`). Product references remain in the product record's validated image collection.

Any feature (Onboarding, Dashboard, Admin) uses `StorageProfiles.ProductDefault` + `StoredImage` — not onboarding-specific types.

## ImageKey

Generated only via `ImageKeyGenerator` → `{uuid}.webp`. Folder from storage profile.

## Local layout

```
public/sync_data/sync_file/
  images/
    avatars/
    covers/
    products/<mainCategoryId>/
    spicialOrder/
```

See also [r2-storage.md](./r2-storage.md).
