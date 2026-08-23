# Storage Image Source Picker System

This document explains the image source picker used by `StorageImageManager`.

## Purpose

`StorageImageManager` manages a single image slot. When the user wants to add an image, the component now asks for the image source instead of immediately opening the file picker.

The supported sources are:

- Choose one image from the device gallery or file picker.
- Capture one new image with the camera.

The component still uploads only one image per slot. It does not support selecting multiple images from this picker.

## Main files

```text
packages/storage-image-manager-core/src/components/StorageImageManager.tsx
src/features/storage/presentation/StorageImageManager.tsx
src/platform/media/capacitor-image-source-adapter.ts
ios/App/App/Info.plist
```

## User flow

1. The empty image slot shows an "Add image" action.
2. Pressing it opens a small source menu.
3. The user chooses either "Choose from device" or "Take a photo".
4. The selected or captured image is converted to a browser `File`.
5. `StorageImageManager` shows the project spinner with localized reading/conversion/preview stages.
6. The image `Blob` is saved in the project IndexedDB database before the preview appears; no local filesystem or cloud-provider write has occurred. The slot carries no upload button — `@asol/page-save-core` runs the upload from the header save dialog.
7. Pressing Upload opens the localized application confirmation dialog.
8. The spinner describes compression, upload, saving, and final-image loading until the stored image renders.

The source picker only changes how the local image file is created. It does not change the storage API, image processing service, database persistence, or the feature-specific `onChange` contract.

## Native behavior

On Android and iOS, the system uses Capacitor Camera through:

```text
src/platform/media/capacitor-image-source-adapter.ts
```

Native source behavior:

- Gallery selection uses `Camera.chooseFromGallery()`.
- Camera capture uses `Camera.takePhoto()`.
- Gallery selection sets `allowMultipleSelection: false`.
- Camera capture uses the rear camera by default.
- The selected native image is read through Capacitor Filesystem and converted to a `File`.
- User cancellation returns `null` silently and does not show an error.
- Permission refusal is surfaced as localized guidance, but is not reported as
  `console.error` because it is an expected user decision.
- Plugin, bridge, and image-conversion failures remain localized UI errors and
  are still reported for diagnosis.

## Web fallback behavior

When the app is not running as a native Capacitor platform:

- "Choose from device" opens a hidden `<input type="file" accept="image/*">`.
- "Take a photo" opens a hidden `<input type="file" accept="image/*" capture="environment">`.

Browser support for direct camera capture depends on the browser and device. On desktop browsers, the capture input may behave like a normal file picker.

## iOS permissions

iOS requires human-readable permission descriptions. These are configured in:

```text
ios/App/App/Info.plist
```

Configured keys:

```text
NSCameraUsageDescription
NSPhotoLibraryUsageDescription
NSPhotoLibraryAddUsageDescription
```

The app only requests camera or photo access when the user explicitly chooses one of those source actions.

## Android notes

The picker uses the Capacitor Camera plugin. `CAMERA` remains declared because
the in-app ML Kit barcode scanner uses the physical camera. Consequently, the
Camera plugin also requires that alias before opening the external camera app.

When the user selects **Take a photo**, the Permission Manager checks the
`camera` alias and requests only `{ permissions: ["camera"] }`. This produces
the Android runtime prompt on first use from Android 6 onward without mixing in
legacy media permissions. A denial is localized; a blocked permission offers
an Android-native button that opens ASOL's own application settings page.

### Gallery selection uses the Android Photo Picker

Google Play rejects broad media access when image selection is one-off or
infrequent, which is exactly ASOL's usage. Gallery selection therefore never
reads the media store directly.

`chooseSingleImage()` calls `Camera.chooseFromGallery()`, which Capacitor
Camera 8 routes to `IONCAMROpenPhotoPickerActivity` in `ioncamera-android`.
That activity launches the **Android Photo Picker**. On releases that predate
the platform picker, the library's `ModuleDependencies` service entry
(`photopicker_activity:0:required`) makes Play Services install the backported
picker module, so the same user-selected, scoped `content://` URI is returned
on every supported API level.

Because the picker hands back a scoped URI, **no media permission is required
at any API level**. The Camera plugin agrees: its `photos` alias maps to an
empty permission array and `getPermissionStates()` always reports it as
granted, so requesting `{ permissions: ["photos"] }` never produces a runtime
prompt. Capture uses `saveToGallery: false`, so it needs no storage write
either.

### Manifest guards against regression

`android/app/src/main/AndroidManifest.xml` declares none of the media or
storage permissions. To stop a library upgrade or a future `npx cap sync` from
silently reintroducing them, the manifest also carries merger directives that
strip them from the merged output:

```text
READ_MEDIA_IMAGES
READ_MEDIA_VIDEO
READ_MEDIA_VISUAL_USER_SELECTED
READ_EXTERNAL_STORAGE
WRITE_EXTERNAL_STORAGE
```

Each is declared as `tools:node="remove"`, so it grants nothing and instead
deletes any matching entry contributed by a dependency. The `<application>`
element additionally carries `tools:remove="android:requestLegacyExternalStorage"`,
which drops the legacy-storage flag injected by `ioncamera-android`. That flag
only changes how *shared* external storage is scoped, and shared storage is
unreachable without a storage permission, so removing it changes no behavior.

None of these guards touch `CAMERA`, the `android.hardware.camera` features, or
how the camera is invoked.

Verify the shipped permission set after any dependency change:

```bash
cd android && ./gradlew :app:processReleaseMainManifest
```

Then confirm no match in:

```text
android/app/build/intermediates/merged_manifest/release/processReleaseMainManifest/AndroidManifest.xml
```

The blame report at
`android/app/build/outputs/logs/manifest-merger-release-report.txt` names the
dependency behind any entry that reappears.

## Architecture contract

`StorageImageManager` remains a UI component. It must not:

- Call `fetch` directly.
- Import repositories, database clients, Drizzle, SQLite, Turso, or R2 providers.
- Save image keys to feature databases itself.
- Know feature-specific table names or API routes.

The allowed flow remains:

```text
UI -> app StorageImageManager wrapper -> @asol/storage-image-manager-core -> app ImageStorageApiService -> Storage API
```

The Capacitor-specific camera code is isolated behind:

```text
src/platform/media/capacitor-image-source-adapter.ts
```

This keeps the UI component platform-aware only through a narrow adapter, not through native implementation details.

## Verification

Run:

```bash
npm run typecheck
npm run architecture:check
npm run cap:build
```

For Android native verification:

```bash
cd android
./gradlew assembleDebug
```

Manual testing should cover:

- Choosing one image from device.
- Capturing one image with the camera.
- Cancelling each source action.
- Uploading the previewed image.
- Removing an existing image and selecting a new one afterward.
- Confirming that selection alone performs no storage write.
- Confirming that an uploaded image has no Replace button and must be deleted before another is selected.
- Confirming that deletion removes the physical local/R2 object before the UI value is cleared.
