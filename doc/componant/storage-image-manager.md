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

| Field              | Purpose                                                                          |
| ------------------ | -------------------------------------------------------------------------------- |
| `id`               | Stable unique id for this component instance                                     |
| `storageProfileId` | Storage profile id: `avatar`, `cover`, `product-default`, etc.                   |
| `maxItems`         | Number of slots rendered by this config. Use `1` for normal one-image instances. |
| `aspectRatio`      | `square`, `landscape`, `portrait`, or `wide`                                     |
| `allowReplace`     | Allows replacing a selected image before upload                                  |
| `confirmUpload`    | Shows confirmation before upload                                                 |
| `confirmRemove`    | Shows confirmation before clearing/removing                                      |

## Usage

```tsx
import {
  StorageImageManager,
  parseStorageImageManagerConfig,
} from "@/features/storage/components/StorageImageManager";
import imageConfig from "./image-configs/store-logo.image.json";

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

## Image source picker

For an empty slot, `StorageImageManager` asks the user how to add the image:

- Choose one image from the device.
- Take one new photo with the camera.

The component still works with one image per slot. The source picker does not enable multiple-image selection.

Native Android/iOS behavior is isolated behind:

```text
src/platform/media/capacitor-image-source-adapter.ts
```

See [Storage Image Source Picker System](../system/storage-image-source-picker-system.md) for the platform details.

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

## Selection and automatic upload

Selecting an image now starts the complete flow:

1. Read the selected native or browser `File`.
2. Build a `data:` preview that works in Android WebView without a temporary Blob URL.
3. Ask for upload confirmation when `confirmUpload` is enabled.
4. Compress and convert the image for the selected storage profile.
5. Send multipart data to the upload API.
6. Persist the returned `imageKey` through the feature's `onChange` handler.

If confirmation is declined, the selected preview remains visible and the manual upload button can retry the same file.

## Diagnostic tracing

Every stage emits a console entry prefixed with `StorageImageManager`. Entries include the slot or profile ID and safe metadata such as MIME type, byte size, output dimensions, storage provider, and returned image key. File bytes and base64 preview contents are never logged.

Expected successful sequence:

```text
[StorageImageManager:<slot>] device-source-requested
[StorageImageManager:<slot>] native-file-picker-returned
[StorageImageManager:<slot>] file-received
[StorageImageManager:<slot>] preview-read-started
[StorageImageManager:<slot>] preview-ready
[StorageImageManager:<slot>] automatic-upload-confirmation
[StorageImageManager:<slot>] upload-started
[StorageImageManager:<profile>] profile-request-start
[StorageImageManager:processor] file-read-start
[StorageImageManager:processor] image-decoded
[StorageImageManager:processor] compression-completed
[StorageImageManager:<profile>] api-upload-start
[StorageImageManager:server] upload-request-received
[StorageImageManager:server] storage-write-completed
[StorageImageManager:<slot>] upload-completed
```

Failures use `console.error` and appear in the Errors section of `/super-admin/logs`. Resource load failures, including Blob resource failures, are also classified as errors and are not ignored.

For example, profile uses `useProfileStoreImages()` to save keys to `profile.db` in development and Turso in production.

## Multiple images

Prefer one versioned config document containing a slot array when a screen needs several independent images.

Profile storefront images use:

```text
src/components/profile/image-configs/storefront-images.image.json
```

The document contains a schema version and independent slot definitions:

```json
{
  "schemaVersion": 1,
  "slots": [
    {
      "id": "profile-store-cover-1",
      "storageProfileId": "cover",
      "maxItems": 1,
      "aspectRatio": "landscape",
      "allowReplace": true,
      "confirmUpload": true,
      "confirmRemove": true
    }
  ]
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
