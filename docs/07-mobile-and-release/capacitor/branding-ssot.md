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

The source must be a square PNG at least 500x500. Opaque and transparent source images are supported. Web and legacy Android outputs preserve source transparency; iOS AppIcon output is flattened onto the sampled icon background because App Store icons must not contain alpha. The generator rejects known legacy branding paths if they reappear.

## Generated Assets

`@asol/branding-core/tooling` generates:

- `public/logo.png`, the full-resolution 1024px icon, for the Open Graph share
  image and the React `AppIcon` component. `AppIcon` renders through
  `next/image`, but the project-wide optimizer is disabled, so consumers receive
  the original asset unless they explicitly use a smaller generated branding file.
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

The generator preserves the complete source frame for Web and legacy Android icons. iOS AppIcon output keeps the same artwork but removes alpha by flattening onto a background sampled from inside the source frame. Android adaptive foreground icons use a 72% content scale with padding sampled from the source near its upper-left interior so transparent rounded corners do not accidentally become black; Android's launcher mask therefore keeps the artwork at the intended optical size. Platform-specific files are resized only to the exact pixel dimensions required by Android and iOS.

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
  package derives the visible application mark from the SSOT and generates
  `ic_stat_asol_notification` for every density. It supports both a coloured
  mark on a neutral field and a neutral/white mark on a chromatic field. FCM, the application manifest,
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

- The launch background is sampled from the authoritative icon itself. For the current SSOT it resolves to the icon blue (`#086FFD`).
- Android uses `@drawable/ic_launcher_monochrome` as the system splash artwork, so only the white SSOT mark is visible over the sampled blue background; the full launcher tile is never drawn on the launch frame.
- Android splash animation duration is zero.
- Android immediately applies `AppTheme.NoActionBar` after the system frame.
- Legacy Capacitor `drawable*/splash.png` files are deleted by the generator.
- iOS Launch Screen images are generated as the same sampled blue full frame with only a centered white SSOT mark. The storyboard fallback background is generated from the same sampled colour, so no white system-background flash is permitted before WebView startup.
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
- Android launch theme must use the SSOT-derived `ic_launcher_background` plus the transparent white `ic_launcher_monochrome` mark, and must not use the full adaptive foreground as splash artwork;
- Android adaptive XML must reference `ic_launcher_monochrome`;
- Android status icons must be transparent monochrome ASOL silhouettes and the
  native receiver must use the full-colour large icon;
- iOS AppIcon must show ASOL, and every native Splash image must be an opaque SSOT-blue frame with only the centered white mark; the LaunchScreen storyboard fallback background must match the same sampled SSOT colour;
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
