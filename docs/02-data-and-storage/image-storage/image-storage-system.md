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

Config: `src/config/storage-profiles.json` (server-only).

## Pipeline

```
UI → ImageStorageService → API
       ↳ compress (Canvas, profile-driven)

Server: Storage Profile → Provider → Persistence
```

**Development** (`NODE_ENV=development`): `LocalStorageProvider` → `public/sync_data/sync_file/images/...`

**Production / Capacitor / static**: profile provider (Cloudflare R2). The general R2 bucket uses `images/profile/...` for avatar/cover and `images/content/...` for advertisements and order images. Product images use the separate product R2 account under `images/products/...`.

`ProductDefault` is the **only** profile on the product account, and
`npm run test:r2-separation` asserts that list equals exactly that — the
separation held in the code while being untrue in the live bucket for a long
time. See [R2 Storage Accounts](../../05-platform-features/r2-storage-accounts.md).

`StorageImageManager` performs no provider write during selection or preview preparation. Before a selected preview becomes visible, its `Blob` and metadata are committed to the `imageUploadDrafts` AsolDB store. Upload starts only after the user presses Upload and confirms the localized application dialog. Removal calls the DELETE API and waits for provider success before clearing the UI value.

## Upload queue

All `StorageImageManager` instances share the FIFO queue in
`src/features/storage/services/image-upload-queue.ts`. The queue processes one
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

`product-default` declares `folderStrategy: "main-category"`. Its local base folder is `images/products`, and its cloud base folder remains `images/products` on the legacy product R2 bucket/account; callers provide only a validated main-category ID as `storageScope`. The server creates `<mainCategoryId>/<uuid>.webp` as the image key, so upload, URL resolution, replacement, and deletion all address the correct provider object without exposing folder construction to the UI.

## Layers

| Layer               | Location                                                        |
| ------------------- | --------------------------------------------------------------- |
| Profiles            | `src/core/storage/profiles/`                                    |
| ImageKeyGenerator   | `src/core/storage/storage/image-key-generator.ts`               |
| Rules               | `src/core/storage/rules/`                                       |
| Processing (Canvas) | `src/features/storage/processing/`                              |
| Providers           | `src/core/storage/providers/`                                   |
| Orchestrator        | `src/core/storage/storage/`                                     |
| **Client service**  | `src/features/storage/services/image-storage-service.ts`        |
| Draft persistence   | `src/features/storage/services/image-upload-draft-service.ts`    |
| API adapter         | `src/features/storage/services/image-storage-api-service.ts`    |
| Hook                | `src/features/storage/hooks/use-storage-profile-upload.ts`      |
| UI                  | `src/features/storage/components/StorageImageManager.tsx`       |

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
import { StorageProfiles } from "@/core/storage/constants/storage-profiles";

StorageProfiles.Avatar;
StorageProfiles.Cover;
StorageProfiles.ProductDefault;
StorageProfiles.SpicialOrder;
```

## Persistence

`user_profiles.avatar_image_key`, `user_profiles.cover_image_key`

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
