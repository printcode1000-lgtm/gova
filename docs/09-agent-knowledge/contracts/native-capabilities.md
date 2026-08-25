# Native Capabilities

## Purpose

Defines what the generated Native Capability Map covers, and the required discipline for a change touching Android permissions/manifest entries, iOS entitlements/Info.plist capability keys, or Capacitor plugin wiring. Read [Project Runtime Contract](../runtime-contract.md) first for the Android/iOS surface definitions this document assumes.

## Scope

Applies to `android/`, `ios/`, and `capacitor.config.ts`. Does not replace release/signing/store policy in `docs/07-mobile-and-release/` — this document is the discoverability layer over native capability surface area, not release process.

## Generated Evidence

`docs/09-agent-knowledge/generated/catalogs/native-capability-map.md` (source: `scripts/docs/native-capability-map.ts`) lists, per platform: capability (Android manifest component/permission, iOS entitlement/Info.plist key, or Capacitor config/plugin-wiring evidence), source file, related features/packages/routes/scripts, and a note describing the evidence kind. Regenerate with `npm run docs:generate`; never hand-edit.

## What It Tracks

- **Android:** `AndroidManifest.xml` `android:name` component/permission declarations, `<uses-permission>` entries, notification-channel evidence, and `@capacitor/*`/`registerPlugin` wiring across `.xml`/`.gradle`/`.kt`/`.java` source.
- **iOS:** `App.entitlements` keys (push/associated-domains/keychain/application-identifier), `Info.plist` usage-description/background-mode/URL-type/`NS*` keys.
- **Shared:** `capacitor.config.ts` presence and whether `webDir` is `"out"` (the Native Payload Invariant in [Runtime Contract](../runtime-contract.md)).

## Required Property Of A Safe Native Change

Every new permission, entitlement, or plugin capability is traceable to a feature/package that actually needs it, and the change is checked against both the platform-specific policy (Android manifest/R8/signing, iOS entitlements/signing/TestFlight) and the shared static-payload contract it hosts.

## Common Risks

- Adding a permission/entitlement without a corresponding feature/package reference — the map shows empty related-features/packages.
- `capacitor.config.ts` losing `webDir: "out"` — breaks the Native Payload Invariant.
- A native-only change that is never checked against the static `out/` payload it wraps.

## Verification

```bash
npm run docs:generate            # regenerate the Native Capability Map
npm run runtime:check:android
npm run runtime:check:ios
npm run runtime:check:static
```

## Related Documents

- [Project Runtime Contract](../runtime-contract.md)
- [Native/Android/iOS Task Template](../templates/native-task.md)
- `docs/07-mobile-and-release/README.md`
