> **Note:** Operational detail relocated here during the 2026-08 architecture reconstruction. Architectural relationships: [docs/01-architecture/](../../01-architecture/README.md).

# Branding Core Module

`@asol/branding-core` owns the application icon identity and every deterministic
derivative used by Web, Android, iOS, and notification surfaces.

## Responsibility

The package has one reason to change: the ASOL application icon contract.

| Door | Runtime | Responsibility |
| --- | --- | --- |
| `@asol/branding-core` | Browser/server safe | Public web paths, Android resource names, notification accent |
| `@asol/branding-core/tooling` | Node only | Validate the SSOT and generate committed platform assets |

The authoritative image is
`packages/branding-core/assets/asol-app-icon.png`. Generated files remain in
their platform-required locations (`public/`, `android/`, `ios/`, and
`packages/native-core/android/src/main/res/`), but their bytes and resource
names are owned and tested by this package. Consumers never generate or
redefine the icon.

`sharp` is a dependency of `branding-core`, not a root application dependency.
Upgrading the image engine therefore stays inside the package, satisfying
module-isolation rule 9.

## Generation

```text
npm run branding:generate
  → packages/branding-core/src/cli.ts
  → @asol/branding-core/tooling
```

The generator writes only when bytes differ. This matters because static/OTA
builds run generation automatically; deterministic no-op writes must not dirty
the native tree and trigger a false native-shell compatibility change.

`npm run dev` remains the fast Next.js command and does not generate. The
checked development command, server build, static build, OTA publication, and
production native build path generate before use. `cap:build:local`
deliberately keeps icon generation disabled and consumes the committed,
previously verified outputs.

## Notification platform contract

Android and iOS expose different capabilities:

- Android requires a white monochrome small/status icon. The generator derives
  the visible SSOT mark for either supported polarity (coloured mark on neutral
  field or neutral/white mark on chromatic field) and emits it for every density
  as `ic_stat_asol_notification`.
- Android expanded notifications additionally use the full-colour
  `asol_notification_large_icon`.
- Android adaptive launchers receive a separate monochrome layer for themed
  icons.
- iOS does not permit an arbitrary per-notification status icon. The OS uses
  the installed application `AppIcon`; that asset is generated from the same
  SSOT.
- Web Push uses a 192px full-colour icon and a transparent 96px badge, resolved
  from the service-worker scope.

The Android manifest, native receiver, FCM transports, and Capacitor local
notification configuration all use the runtime constants or generated resource
names pinned by `test:branding-core`.

## Native launch contract

The operating-system launch frame is also branding-owned and appears before the
Capacitor WebView can render anything. Android uses the generated monochrome
white mark over `ic_launcher_background`; iOS uses a generated full-frame image
with the sampled SSOT background and only the centered white mark. The iOS
storyboard fallback colour is synchronized from the same SSOT sample. The
branding test pins these relationships so a future icon change cannot silently
reintroduce the full icon tile or a white launch background.

## Boundary with Google Play

`@asol/google-play-store-assets-core` remains independent. It validates and
manages Play Console listing assets; it does not own launcher, runtime, or
notification icon generation. Store listing upload remains a manual release
console responsibility.

## Gates

```text
npm run test:branding-core
npm run architecture:check
```

`test:branding-core` regenerates first, verifies dimensions/transparency,
compares duplicated Android resource copies byte-for-byte, pins every consumer,
and confirms `npm run dev` and the Google Play package remain unchanged. It
gates `build`, `build:static`, and `test`. It is not a GitHub required check.
