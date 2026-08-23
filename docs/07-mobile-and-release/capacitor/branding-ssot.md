# Branding SSOT

## Source Of Truth

The only authoritative ASOL application icon is:

```text
packages/branding-core/assets/asol-app-icon.png
```

Do not edit generated Android, iOS, or web icons directly. Replace the SSOT image, then run:

```powershell
npm run branding:generate
```

The source must be a square PNG at least 500x500. Its original background is preserved; opaque images are supported. The generator rejects known legacy branding paths if they reappear.

## Generated Assets

`@asol/branding-core/tooling` generates:

- `public/logo.png`, the full-resolution 1024px icon, for the Open Graph share
  image and the React `AppIcon` component. `AppIcon` renders through
  `next/image`, which resizes on the server, so the large source costs nothing
  at request time.
- `public/icons/asol-app-icon-192.png` for the browser tab and
  `apple-touch-icon`. Those are raw `<link>` tags that nothing resizes, so the
  named file is downloaded verbatim on first paint — 30KB here against 593KB
  for the original, at a size no browser renders above 180px.
- Android launcher icons for mdpi through xxxhdpi.
- Android adaptive foreground icons and round icons.
- Android monochrome/themed launcher icon inputs.
- Android monochrome notification status icons in every density, in both the
  application and `native-core` resource trees.
- Android full-colour notification large icon.
- Web Push full-colour icon and monochrome badge.
- iOS `AppIcon-512@2x.png`.
- All iOS Launch Screen image scales.

The generator preserves the complete source frame and its original background. Web, iOS, and legacy Android icons are not trimmed, cropped, padded, or flattened onto another color. Android adaptive foreground icons use a 72% content scale with opaque padding sampled from the source image's top-left background pixel so Android's launcher mask does not make the artwork appear oversized; no transparency or unrelated replacement color is introduced. Platform-specific files are resized only to the exact pixel dimensions required by Android and iOS.

## Automatic Generation

Branding generation runs automatically before:

- `npm run dev:checked`
- `npm run build`
- `npm run build:static`
- `npm run ota:publish` through `build:static`
- `npm run cap:build` through OTA publication

This prevents native and web icon copies from drifting apart.

`npm run dev` deliberately stays the fast `next dev --turbo --port 3001`
command and does not regenerate assets. Generated assets are committed, so fast
development uses the last verified package output; use `dev:checked` after
replacing the SSOT.

## Notification identity

- **Android status bar:** Android requires a white monochrome small icon. The
  package derives the ASOL tree silhouette from the SSOT and generates
  `ic_stat_asol_notification` for every density. FCM, the application manifest,
  Capacitor local notifications, and the application-owned native receiver all
  use that resource name.
- **Android expanded notification:** the native receiver also displays
  `asol_notification_large_icon`, a full-colour SSOT-derived image.
- **iOS:** iOS does not accept an Android-style custom small status icon. The
  operating system presents the installed application's `AppIcon`, which is
  generated from the same package SSOT.
- **Web Push:** the service worker uses `asol-app-icon-192.png` and the
  transparent `asol-notification-badge-96.png`, resolved against its own scope
  so root and base-path deployments work.

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
| `packages/branding-core/assets/asol-app-icon.png` | Authoritative source image |
| `packages/branding-core/src/tooling/generate-branding-assets.ts` | Deterministic multi-platform generator |
| `packages/branding-core/src/index.ts` | Runtime-safe web and Android resource-name contract. Three web paths, deliberately separate: `BRANDING_WEB_APP_ICON_PATH` (1024px original), `BRANDING_WEB_BROWSER_ICON_PATH` (192px tab/apple icon), `BRANDING_WEB_PUSH_ICON_PATH` (192px tray icon) |
| `public/logo.png` | Generated web/app UI icon |
| `public/icons/` | Generated browser tab / `apple-touch-icon`, Web Push icon, and badge |
| `android/app/src/main/res/mipmap-*` | Generated Android launcher/adaptive icons |
| `android/app/src/main/res/drawable-*` | Generated Android monochrome launcher and notification icons |
| `packages/native-core/android/src/main/res/drawable-*` | Generated notification resources consumed by native receiver code |
| `android/app/src/main/res/values/styles.xml` | Native launch theme and immediate handoff |
| `ios/App/App/Assets.xcassets/AppIcon.appiconset` | Generated iOS app icon |
| `ios/App/App/Assets.xcassets/Splash.imageset` | Generated iOS Launch Screen image |

## Verification

```powershell
npm run branding:generate
npm run test:branding-core
npm run typecheck
npm run cap:build
```

After generation:

- no Android `drawable*/splash.png` should exist;
- Android launch theme must reference `ic_launcher_foreground`;
- Android adaptive XML must reference `ic_launcher_monochrome`;
- Android status icons must be transparent monochrome ASOL silhouettes and the
  native receiver must use the full-colour large icon;
- iOS AppIcon and Splash must show ASOL, not the Capacitor placeholder;
- `public/logo.png` must be derived from the same SSOT;
- `cap:build` must synchronize Android and iOS without creating an APK or IPA.

## The native shells are not on every machine

`.vercelignore` keeps `/android/` and `/ios/` out of the upload: they are store shells
rebuilt by the Capacitor pipeline, not inputs to the hosted build. `test:branding-core`
read `android/app/src/main/AndroidManifest.xml` unconditionally and failed the Vercel
build with `ENOENT`, taking the main application's production deployment down on a
machine where nothing was wrong.

Shell assertions are now conditional and print what they skipped. The generated sources
under `packages/native-core/**` are always present and stay unconditional — those are
what the contract is really about; the shell copies are a mirror of them.

Any new assertion against `android/` or `ios/` must go through the same guard.
