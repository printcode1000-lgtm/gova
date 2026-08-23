# Package Layers

## Purpose

Explain the five architectural layers in `PackageLayer` and how packages at each layer may interact. Agents MUST identify a package's layer before changing imports or adding dependencies.

## Scope

Layer definitions for all 41 sealed packages. Inter-package dependency detail is in [dependency-map.md](../08-reference/dependency-map.md).

## Layer stack

```text
  enforcement   @asol/architecture-core          scan + contracts; no vendor ownership
  bridge        @asol/account-bridge               device-side cross-account bridging
  declarations  @asol/account-declarations         pure account metadata; imports nothing
  composition   @asol/*-composition (×6)           per-account wiring; mayImportApp: true
  capability    all remaining @asol/*-core        domain + infrastructure owners
```

Historical docs numbered layers 1–4 (capability → composition → declarations → bridge). The registry adds `enforcement` as a distinct layer for `@asol/architecture-core`.

## Layer rules

| Layer | May import | Must never |
|---|---|---|
| `capability` | Other `@asol/*` through declared doors; owned vendor SDKs | `@/…`; vendor SDKs owned elsewhere; deep imports |
| `composition` | `@asol/account-declarations/<account>`, capability doors, `@/features/*` | Relative paths into other packages; vendor SDKs |
| `declarations` | Nothing (asserted by test) | Any runtime or vendor import |
| `bridge` | `@asol/native-core`, `@asol/branding-core` | Server-side execution; `@/` |
| `enforcement` | Toolchain only (`typescript` compiler API); `@asol/ota-core/publishing` for native surface report | Application code; vendor infrastructure |

## Composition layer detail

Each `*-composition` package corresponds to one service deployment:

| Package | Account |
|---|---|
| `@asol/orders-composition` | orders |
| `@asol/products-composition` | products |
| `@asol/profiles-composition` | profiles |
| `@asol/notifications-composition` | notifications |
| `@asol/submain-composition` | submain |
| `@asol/sub2main-composition` | sub2main |

Compositions import `@asol/account-declarations/<account>` — never the declarations barrel — so one deployment does not mirror another account's env key names.

`@asol/notifications-composition` is the only composition with a direct capability edge (`notifications-core`). Other accounts reach capabilities through application data-access wiring.

## Capability layer clusters

Within `capability`, packages group by infrastructure ownership:

| Cluster | Packages | Vendor owner |
|---|---|---|
| Data | `data-core`, `data-health-core`, `backup-core` | Drizzle, SQLite, Turso in `data-core` only |
| Storage | `storage-core`, `storage-image-manager-core` | `@aws-sdk/client-s3` in `storage-core` |
| Native | `native-core`, `map-core`, `ota-core`, `account-bridge` | Capacitor plugins in `native-core` |
| Notifications | `notifications-core` | `web-push`, `google-auth-library` |
| UI capability | `hero-slider-core`, `featured-marquee-core`, `trending-ribbon-core`, `page-snapshot-core`, `product-style-core` | none |
| Platform | `architecture-core`, `observability-core`, `env-core`, `format-core`, `signed-token-core`, `service-runtime-core`, `service-mirror-core`, `vercel-deploy-core`, `release-core`, `secrets-core`, `system-logs-core`, `dev-core`, `auth-core`, `catalog-core`, `product-core`, `orders-core`, `page-save-core`, `branding-core`, `google-play-store-assets-core` | per registry `vendorModules` |

Canonical ownership: [capability-map.md](../08-reference/capability-map.md).

## Source Map

- `packages/architecture-core/src/registry/capability-registry.ts` — `PackageLayer`, `mayImportApp`
- Composition tests: `packages/*-composition/src/tests/`

## Related Documents

- [Package Model](./package-model.md)
- [Composition Model](../04-composition/composition-model.md)
- [Allowed Dependencies](../03-dependencies/allowed-dependencies.md)

## Change Impact

Moving a package between layers requires registry `layer` update, import contract changes, and capability-closure test updates for affected compositions.

## Invariants

1. `declarations` packages import nothing — verified by `test:account-declarations`.
2. Only `composition` packages have `mayImportApp: true`.
3. Layer violations (e.g. capability importing `@/`) fail `checkPackageAppImportContract`.
