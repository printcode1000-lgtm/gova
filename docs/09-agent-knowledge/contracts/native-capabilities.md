# Native Capability Map

## Purpose

Defines the Native Capability Map: which native capability (camera, geolocation, push, filesystem, barcode scanning, and so on) is owned by which package, and how that capability links to its Android and iOS platform-native implementation. This closes the gap between "there is a shared TypeScript API" and "here is what actually runs on-device per platform."

## Ownership

`@asol/native-core` owns every Capacitor-plugin-backed native capability behind a small set of declared doors (its `package.json` `exports`: the package root, `./platform-globals`, and the Android-specific build-preflight/R8-policy validation scripts). Capacitor plugin discovery itself is root-owned through `capacitor.config.ts`'s `includePlugins`, which `native-core` owns via the architecture registry's root-vendor-owned-files mechanism — so upgrading Capacitor, or adding a new native plugin, is a change scoped to `native-core`, not to arbitrary feature code.

## Android/iOS Linkage

Every native capability entry links three things:

| Field | Meaning |
|---|---|
| Capability | The user-facing capability name (camera, geolocation, push notifications, local notifications, filesystem, clipboard, haptics, barcode scanning, share, device info, network status, screen orientation, status bar, keyboard, splash screen, action sheet, dialog, toast, text zoom, browser, file picker, speech recognition). |
| Shared door | The `@asol/native-core` export used by application code (never a deep import of a Capacitor plugin package directly from feature code). |
| Android implementation | The corresponding `android/` project wiring — permission declarations in the Android manifest, Gradle plugin dependency, and any Android-specific behavior difference. |
| iOS implementation | The corresponding `ios/` project wiring — `Info.plist` entitlement/usage-description entries, Swift Package Manager dependency, and any iOS-specific behavior difference. |
| Shared payload dependency | Confirmation the capability works against the same static `out/` payload both platforms consume (per the [Runtime Contract](../runtime-contract.md)'s Native Payload Invariant), plus any capability that is intentionally native-only and has no web/dev equivalent. |

A capability entry is incomplete if it names the shared TypeScript door but not both platform-native wirings — the map exists specifically because "the plugin exists in `package.json`" is not evidence the platform manifest/entitlement/permission side is wired correctly.

## Native-Only vs. Shared-Payload Capabilities

Most capabilities in this map are consumed by shared application code that also runs in Development/Web (with a graceful no-op or feature-detection fallback outside a native shell). A minority are native-only by design (for example, native push-token registration). The map states which is which so an agent does not assume web-testable behavior is representative of the native path, or vice versa.

## Why This Matters for Every Change

Per the [Runtime Contract](../runtime-contract.md)'s Native Payload Invariant, Android and iOS production shells consume the same release `out/` payload unless an explicit native-only flow says otherwise — so a static web regression is normally a native regression too, while native plugin/permission behavior can differ even when the shared `out/` code is byte-identical. The Native Capability Map is the concrete, per-capability evidence an agent uses to tell those two failure modes apart instead of guessing.

## Regeneration

The map is `generated` truth: derived from `@asol/native-core`'s declared dependencies/exports plus tracked `android/`/`ios/` native source and configuration already indexed by the Knowledge Graph's native-source scan. Regenerate with:

```bash
npm run docs:generate
# or
npm run architecture:docs
```

Never hand-edit the generated map. If a capability's platform wiring is missing or wrong, fix the Android/iOS project files or `native-core`'s exports, then regenerate.

## Verification

```bash
npm run docs:ci
npm run architecture:check
npm run runtime:check:android
npm run runtime:check:ios
```

## Related Documents

- [Runtime Compatibility Contract](./runtime-compatibility.md)
- [Native Task Template](../templates/native-task.md)
- `docs/01-architecture/02-packages/module-isolation-rules.md` (protected) — `native-core` ownership rules
