# Page Save System

`@asol/page-save-core` is the single registry for user-triggered page persistence across ASOL.

## Package

| Door | Path |
| ---- | ---- |
| Browser/runtime | `@asol/page-save-core` → `packages/page-save-core/src/index.ts` |

The registry stores one active page registration at a time. Each editable surface registers through `usePageSaveRegistration` in `src/features/page-save/hooks/use-page-save-registration.ts`.

IndexedDB wiring lives in `src/features/page-save/page-save-core-bootstrap.ts` (`ASOL_DB_STORES.PAGE_SAVE_PENDING`, DB version 10).

## Contract

| API | Purpose |
| --- | ------- |
| `registerPageSave()` | Mount a page save scope with save items |
| `updatePageSaveRegistration()` | Sync label, return path, items, saving, canSave |
| `openPageSaveDialog()` / `closePageSaveDialog()` | Header dialog lifecycle |
| `setPageSaveItemSelected()` | Toggle per-item checkbox selection |
| `executePageSave()` | Save only selected dirty items from the open dialog |
| `getPageSaveSnapshot()` | Read header + dialog state |
| `subscribePageSave()` | React external store subscription |
| `hydratePageSavePendingFromStorage()` | Restore pending icon state after app restart |
| `configurePageSaveCore()` | Wire IndexedDB storage port (bootstrap only) |

## Header indicator

`PageSaveHeaderButton` in `src/features/page-save/components/PageSaveHeaderButton.tsx` is mounted in `AppHeader`. `PageSaveRuntimeInit` in `AppShell` registers storage ports and hydrates pending records on startup.

- Appears when the active scope has dirty items, is saving, or a persisted pending record exists
- Shows wave animation while dirty (not saving)
- Opens `PageSaveDialog` on tap (does not save immediately)
- Hides automatically when all dirty items clear after a successful save

## Save dialog

`PageSaveDialog` shows:

- Page name (`label` / `pageLabel`)
- Dirty save items with checkboxes (**selected by default**)
- A per-item `description` explaining what will happen (upload, delete, save fields)
- Blocked items when `canSave` is false for that item
- Confirm saves only checked dirty items via `executePageSave()`

When `StorageImageManager` uses `confirmUpload: true`, remove/clear actions run immediately without a separate confirmation dialog; the page-save dialog carries the upload/delete messaging instead.

After a successful save, the registry marks the saved items clean immediately so the header icon hides without waiting for the next React sync.

When the user confirms save while the target page is not mounted, the registry navigates to `returnPath`, reopens the dialog on that page, and completes save there.

## Image uploads

When `StorageImageManager` uses `confirmUpload: true`, slots stage files locally and expose `hasPending()` / `uploadPending()` on the manager handle. Features must:

1. Register image upload as a page-save item (see `buildImageUploadPageSaveItem()`)
2. Implement `prepareForSave(selectedItemIds)` to call `uploadPending()` for selected image items
3. Never render a per-slot upload button (the core component no longer does)

Onboarding image handles can register through `registerPageSaveImageUploadHandle()` in `src/features/page-save/runtime/page-save-image-upload-registry.ts`.

## Persistence

While any item stays dirty, the registry writes a `PageSavePendingRecord` to IndexedDB. After app close/reopen, `hydratePageSavePendingFromStorage()` keeps the header icon visible until the user saves or all items become clean.

Checkbox selection is persisted with the pending record.

## Page integration

Every user-triggered save surface must:

1. Register with `usePageSaveRegistration({ id, label, returnPath, items, isSaving, canSave, save })`
2. Expose one or more `items` (`id`, `label`, `isDirty`, `canSave`)
3. Implement `save(selectedItemIds)` and return `boolean`
4. Route staged image uploads through `prepareForSave()` when applicable
5. Remove local save buttons/banners that bypass the registry

### Current registrations

| Scope ID | Surface |
| -------- | ------- |
| `profile-edit` | `/profile?mode=edit` unified editor (per-section items + store image upload via `prepareForSave`) |
| `product-*` | Product create/edit (`product-images`, `product-details`) |
| `super-admin-hero-slider` | Home hero slider admin (`hero-slider-images`, `hero-slider-config`) |
| `super-admin-featured-marquee` | Featured products marquee admin |
| `super-admin-trending-ribbon` | Trending ribbon admin |
| `catalog-studio` | Catalog Studio JSON drafts + staged image upload |
| `release-console-store-text` | Google Play store text/listings |
| `release-console-store-images` | Google Play staged image uploads |
| `release-console-play-tracks` | Google Play track update form |
| `release-console-ota-rollout` | OTA rollout percentage |
| `onboarding` | Seller onboarding wizard |
| `onboarding-product-form` | Onboarding product draft while the form is open |

## Forbidden patterns

- Inline page save buttons that call APIs directly without registry registration
- Duplicate save banners that trigger persistence outside `executePageSave()`
- Per-slot upload buttons on `StorageImageManager` when `confirmUpload: true`
- Deep imports from `@asol/page-save-core/src/**`

## Tests

```bash
npm run test:page-save-core
```

Structural coverage also lives in `src/features/storage/tests/image-upload-queue.test.ts` for import-door enforcement on migrated surfaces.
