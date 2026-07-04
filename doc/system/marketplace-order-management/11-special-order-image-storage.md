# Special-Order Image Storage

## Profile contract

Custom marketplace order images use the storage profile ID `spicialOrder`. The spelling is intentionally preserved because profile IDs are stable API and object-storage contracts.

| Property | Value |
|---|---|
| Profile constant | `StorageProfiles.SpicialOrder` |
| Profile ID | `spicialOrder` |
| Maximum processed image size | 500 KB / 512,000 bytes |
| Output format | WebP |
| Development folder | `public/sync_data/sync_file/images/spicialOrder/` |
| Production R2 prefix | `images/spicialOrder/` |

Development automatically resolves the configured Cloudflare profile to `LocalStorageProvider`; production resolves it to Cloudflare R2. Both providers receive the same object path, so no environment-specific folder logic is required in the marketplace module.

## Upload flow

1. Render `StorageImageManager` with `storageProfileId: StorageProfiles.SpicialOrder`.
2. The client obtains the profile, converts/compresses the selected image to WebP, and enforces the 500 KB limit.
3. The server repeats profile, MIME, format, and byte-size validation.
4. The provider writes `images/spicialOrder/<uuid>.webp`.
5. The owning feature receives `imageKey` and `url`.
6. Call `addCustomRequestImage` with `storageProfileId`, `imageKey`, URL, WebP MIME type, processed file size, optional dimensions, filename, and description.
7. The marketplace database stores the storage identity and writes an image-upload audit event.

The example manager configuration is `src/modules/marketplace-orders/examples/custom-request-images.image.json`.

## Required persistence behavior

Do not store base64 data or image bytes in the marketplace database. Store the provider-independent key and display URL. Removal must call the shared storage deletion pipeline with `spicialOrder` and the saved key before deleting the marketplace image record. A custom request cannot advance to pricing or fulfilment without at least one registered image.
