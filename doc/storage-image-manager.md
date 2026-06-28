# Storage Image Manager

`StorageImageManager` is the reusable one-image upload component for GOVA.

It handles image selection, preview, upload confirmation, storage upload, and removal. It does not know any database, table, feature, or persistence rule.

## Location

```text
src/features/storage/components/StorageImageManager.tsx
```

Feature-specific JSON config files should live beside the feature UI that uses them.

Example for profile:

```text
src/components/profile/image-configs/
```

## JSON format

Every config file must use this exact shape:

```json
{
  "id": "profile-store-logo",
  "storageProfileId": "avatar",
  "maxItems": 1,
  "aspectRatio": "square",
  "allowReplace": true,
  "confirmUpload": true,
  "confirmRemove": true
}
```

## Fields

| Field | Purpose |
|---|---|
| `id` | Stable unique id for this component instance |
| `storageProfileId` | Storage profile id: `avatar`, `cover`, `product-default`, etc. |
| `maxItems` | Number of slots rendered by this config. Use `1` for normal one-image instances. |
| `aspectRatio` | `square`, `landscape`, `portrait`, or `wide` |
| `allowReplace` | Allows replacing a selected image before upload |
| `confirmUpload` | Shows confirmation before upload |
| `confirmRemove` | Shows confirmation before clearing/removing |

## Usage

```tsx
import {
  StorageImageManager,
  parseStorageImageManagerConfig,
} from '@/features/storage/components/StorageImageManager';
import imageConfig from './image-configs/store-logo.image.json';

const config = parseStorageImageManagerConfig(imageConfig);

<StorageImageManager
  config={config}
  value={image ? [image] : []}
  onChange={(images) => {
    const uploaded = images[0] ?? null;
    // Feature hook saves uploaded.imageKey where it belongs.
  }}
/>;
```

## Persistence rule

The component uploads/deletes through the storage system only.

It returns uploaded images through `onChange`:

```ts
type StoredImage = {
  imageKey: string;
  url: string;
};
```

The feature that uses the component must save the `imageKey` in its own layer.

For example, profile uses `useProfileStoreImages()` to save keys to `profile.db` in development and Turso in production.

## Multiple images

Prefer one config file per image slot when a screen needs several independent images.

Example: three cover images:

```text
store-cover-1.image.json
store-cover-2.image.json
store-cover-3.image.json
```

Each file can use:

```json
{
  "id": "profile-store-cover-1",
  "storageProfileId": "cover",
  "maxItems": 1,
  "aspectRatio": "landscape",
  "allowReplace": true,
  "confirmUpload": true,
  "confirmRemove": true
}
```

## Architecture contract

`StorageImageManager` must not:

- Call `fetch` directly
- Import repositories, database clients, Drizzle, SQLite, Turso, or R2 providers
- Save image keys to feature databases itself
- Know feature-specific table names or API routes

Allowed path:

```text
UI -> StorageImageManager -> useStorageProfileUpload -> ImageStorageService -> GovaApiClient -> Storage API
```

Feature persistence stays outside the component:

```text
StorageImageManager onChange -> feature hook -> feature client service -> feature API -> feature database
```
