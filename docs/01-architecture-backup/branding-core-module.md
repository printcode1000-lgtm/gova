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

- Android requires a white monochrome small/status icon. The generator removes
  the opaque SSOT background and emits an ASOL tree silhouette for every
  density as `ic_stat_asol_notification`.
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
gates `build`, `build:static`, `test`, and the required CI workflow.
