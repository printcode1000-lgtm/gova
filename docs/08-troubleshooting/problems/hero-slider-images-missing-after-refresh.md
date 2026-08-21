# Hero slider images missing after page refresh

## Symptom

`/super-admin/hero-slider` shows `StorageImageManager` in `border-destructive` with "إضافة صورة" after reload. Browser logs report `ResourceLoadError` for `/sync_data/sync_file/images/advertisements/home-hero-slider/{uuid}.webp` (local dev) or equivalent R2 URLs in production.

The database still lists `imageKey` values for the slides.

## Cause

Two failures stacked:

1. **Autosave race:** a save could run before React flushed new `imageKey` values, then delete previously stored keys from storage while the next save wrote those keys back to SQLite/Turso without the files.
2. **Environment-specific URLs in the database:** persisting dev-only `/sync_data/...` URLs alongside `imageKey` breaks refresh and any non-local runtime (production, static export, Android OTA) that must resolve R2 URLs from `imageKey` only.

## Fix

- Client autosave waits until uploads finish and reads the latest config from a synchronous ref.
- Server `prepareHomeHeroConfigForSave` stores only `imageKey` for managed slides and resolves `image` on every read through the active provider.
- Server rejects saves that reference managed images without `imageKey` or that would wipe every stored key while managed slides remain.
- Storage deletion runs only after a successful save and skips keys whose objects are already missing.

## Recovery

Re-upload each broken slide image and save. Orphaned `imageKey` rows without storage objects cannot be repaired automatically.

See [HeroSlider Developer Guide](../../04-ui-components/guides/hero-slider-guide.md).
