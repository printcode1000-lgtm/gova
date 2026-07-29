# Branding SSOT

## Source Of Truth

The only authoritative ASOL application icon is:

```text
assets/branding/asol-app-icon.png
```

Do not edit generated Android, iOS, or web icons directly. Replace the SSOT image, then run:

```powershell
npm run branding:generate
```

The source must be a square PNG at least 500x500. Its original background is preserved; opaque images are supported. The generator rejects known legacy branding paths if they reappear.

## Generated Assets

`scripts/generate-branding-assets.ts` generates:

- `public/logo.png` for web metadata and all React `AppIcon` usages.
- Android launcher icons for mdpi through xxxhdpi.
- Android adaptive foreground icons and round icons.
- Android monochrome/themed icon input.
- iOS `AppIcon-512@2x.png`.
- All iOS Launch Screen image scales.

The generator preserves the complete source frame and its original background. Web, iOS, and legacy Android icons are not trimmed, cropped, padded, or flattened onto another color. Android adaptive foreground icons use a 72% content scale with opaque padding sampled from the source image's top-left background pixel so Android's launcher mask does not make the artwork appear oversized; no transparency or unrelated replacement color is introduced. Platform-specific files are resized only to the exact pixel dimensions required by Android and iOS.

## Automatic Generation

Branding generation runs automatically before:

- `npm run dev`
- `npm run build`
- `npm run build:static`
- `npm run ota:publish` through `build:static`
- `npm run cap:build` through OTA publication

This prevents native and web icon copies from drifting apart.

## Native Launch Screen

The first frame shown after tapping an application is controlled by the operating system while Capacitor creates the WebView. It cannot be removed completely:

- Android 12+ requires a system splash screen.
- iOS requires a Launch Screen.

ASOL makes this phase visually continuous instead of showing a separate Capacitor page:

- Android uses `@mipmap/ic_launcher_foreground` on the shared white launch background.
- Android splash animation duration is zero.
- Android immediately applies `AppTheme.NoActionBar` after the system frame.
- Legacy Capacitor `drawable*/splash.png` files are deleted by the generator.
- iOS Launch Screen images use the same ASOL SSOT icon on white.
- React Splash continues immediately after native WebView startup.

There is no application route or HTML page before `/`. The only pre-React frame is the mandatory native operating-system launch frame.

## Files

| File | Responsibility |
|---|---|
| `assets/branding/asol-app-icon.png` | Authoritative source image |
| `scripts/generate-branding-assets.ts` | Deterministic multi-platform generator |
| `public/logo.png` | Generated web/app UI icon |
| `android/app/src/main/res/mipmap-*` | Generated Android launcher/adaptive icons |
| `android/app/src/main/res/values/styles.xml` | Native launch theme and immediate handoff |
| `ios/App/App/Assets.xcassets/AppIcon.appiconset` | Generated iOS app icon |
| `ios/App/App/Assets.xcassets/Splash.imageset` | Generated iOS Launch Screen image |

## Verification

```powershell
npm run branding:generate
npm run typecheck
npm run cap:build
```

After generation:

- no Android `drawable*/splash.png` should exist;
- Android launch theme must reference `ic_launcher_foreground`;
- iOS AppIcon and Splash must show ASOL, not the Capacitor placeholder;
- `public/logo.png` must be derived from the same SSOT;
- `cap:build` must synchronize Android and iOS without creating an APK or IPA.
