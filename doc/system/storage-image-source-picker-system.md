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
src/features/storage/components/StorageImageManager.tsx
src/platform/media/capacitor-image-source-adapter.ts
ios/App/App/Info.plist
```

## User flow

1. The empty image slot shows an "Add image" action.
2. Pressing it opens a small source menu.
3. The user chooses either "Choose from device" or "Take a photo".
4. The selected or captured image is converted to a browser `File`.
5. `StorageImageManager` shows the preview.
6. The existing upload confirmation and upload flow continue unchanged.

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
- Real permission or plugin failures are surfaced through localized UI errors.

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

The picker uses the Capacitor Camera plugin. Because the current flow does not save captured photos to the gallery (`saveToGallery: false`), no extra Android storage permission is required for this feature.

## Architecture contract

`StorageImageManager` remains a UI component. It must not:

- Call `fetch` directly.
- Import repositories, database clients, Drizzle, SQLite, Turso, or R2 providers.
- Save image keys to feature databases itself.
- Know feature-specific table names or API routes.

The allowed flow remains:

```text
UI -> StorageImageManager -> useStorageProfileUpload -> ImageStorageService -> GovaApiClient -> Storage API
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
- Replacing/removing an existing image when the config allows it.
