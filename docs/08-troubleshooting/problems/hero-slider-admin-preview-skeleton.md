# Super-admin hero slider live preview stuck on skeleton

## Symptom

`/super-admin/hero-slider` shows a pulsing `Skeleton` over the live carousel after uploading slide images. The `StorageImageManager` slot below can still show the selected or uploaded preview.

## Cause

Three preview bugs stacked:

1. Admin-edit used a full-carousel skeleton until `next/image` fired `onLoad`. Failed or optimizer-skipped URLs never dismissed it.
2. Slide transition class names were concatenated without spaces (`inset-0transition-transform…`), so the `fill` image parent had no size.
3. Local uploaded files use `/sync_data/sync_file/...`. The Next.js optimizer does not reliably serve newly written files in that tree.

Selecting a file is not enough: `confirmUpload` keeps the picker preview inside `StorageImageManager` until the user confirms Upload. The carousel reads `slide.image` only after that.

## Fix

- Admin-edit no longer uses the blocking skeleton; it shows the slide or the unavailable placeholder.
- Slide layout classes stay space-separated.
- `shouldUseUnoptimizedImage` includes `blob:`, `data:`, and `/sync_data/sync_file/`.
- Confirm Upload (and Save, which uploads pending drafts first) before expecting the live preview URL to change.

See [HeroSlider Developer Guide](../../04-ui-components/guides/hero-slider-guide.md).
