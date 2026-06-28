# Image Storage System

Profile-driven multi-provider architecture. The UI passes only **storage profile ids** (`avatar`, `cover`, `product-default`) — never provider names, folders, or size limits.

## Contract

| Profile id | Max KB | Provider (prod) | Folder |
|---|---|---|---|
| `avatar` | 20 | CloudflareR2 | `images/avatars` |
| `cover` | 30 | CloudflareR2 | `images/covers` |
| `product-default` | 30 | CloudflareR2 | `images/products/default` |

Config: `src/config/storage-profiles.json` (server-only).

## Pipeline

```
Client: Rules → Canvas (WebP) → API
Server: Storage Profile → Provider → Persistence
```

**Development** (`NODE_ENV=development`): always `LocalStorageProvider` → `public/sync_data/sync_file/`.

**Production / Capacitor / static**: profile provider (Cloudflare R2). Never uses `public/sync_data`.

## Layers

| Layer | Location |
|---|---|
| Profiles | `src/core/storage/profiles/` |
| Rules | `src/core/storage/rules/` |
| Processing (Canvas) | `src/core/storage/processing/` |
| Providers | `src/core/storage/providers/` |
| Orchestrator | `src/core/storage/storage/` |
| Client service | `src/features/storage/services/image-storage-api-service.ts` |
| Hook | `src/features/storage/hooks/use-storage-profile-upload.ts` |
| UI | `src/features/storage/components/StorageProfileImageUpload.tsx` |

## APIs

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/storage/profiles/:profileId` | Client-safe limits (`id`, `maxImageSizeKB`) |
| POST | `/api/storage/images/upload` | Upload WebP (multipart) |
| DELETE | `/api/storage/images/:imageKey?storageProfileId=` | Delete |
| GET/PUT | `/api/profile/store-images` | Persist avatar/cover keys on `user_profiles` |

## Persistence

`user_profiles.avatar_image_key`, `user_profiles.cover_image_key`

Product images: `Product.image` in onboarding state (imageKey + url). No products table yet.

## ImageKey

UUID + `.webp` only (e.g. `a1b2c3d4-....webp`). Folder comes from the storage profile.

## Google Drive

Stub only: `GoogleDriveProvider` + `GoogleDriveLocation` interface (`folderId`, `fileId`).

See also [r2-storage.md](./r2-storage.md) for Cloudflare env vars.
