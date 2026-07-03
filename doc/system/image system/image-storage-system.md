# Image Storage System

Profile-driven multi-provider architecture. The UI passes only **storage profile ids** via `StorageProfiles.*` — never provider names, folders, or size limits.

## Contract

| Profile                          | Max KB | Format | Enabled | Folder                                   |
| -------------------------------- | ------ | ------ | ------- | ---------------------------------------- |
| `StorageProfiles.Avatar`         | 20     | webp   | ✓       | `images/avatars`                         |
| `StorageProfiles.Cover`          | 30     | webp   | ✓       | `images/covers`                          |
| `StorageProfiles.ProductDefault` | 30     | webp   | ✓       | `images/products/<mainCategoryId>`       |
| `StorageProfiles.HomeHeroSlider` | 1024   | webp   | ✓       | `images/advertisements/home-hero-slider` |

Config: `src/config/storage-profiles.json` (server-only).

## Pipeline

```
UI → ImageStorageService → API
       ↳ compress (Canvas, profile-driven)

Server: Storage Profile → Provider → Persistence
```

**Development** (`NODE_ENV=development`): `LocalStorageProvider` → `public/sync_data/sync_file/images/...`

**Production / Capacitor / static**: profile provider (Cloudflare R2).

`StorageImageManager` performs no provider write during selection or preview preparation. Upload starts only after the user presses Upload and confirms the localized application dialog. Removal calls the DELETE API and waits for provider success before clearing the UI value.

`product-default` declares `folderStrategy: "main-category"`. Its configured base folder is `images/products`; callers provide only a validated main-category ID as `storageScope`. The server creates `<mainCategoryId>/<uuid>.webp` as the image key, so upload, URL resolution, replacement, and deletion all address the same local/R2 object without exposing folder construction to the UI.

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
| API adapter         | `src/features/storage/services/image-storage-api-service.ts`    |
| Hook                | `src/features/storage/hooks/use-storage-profile-upload.ts`      |
| UI                  | `src/features/storage/components/StorageProfileImageUpload.tsx` |

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
```

See also [r2-storage.md](./r2-storage.md).
