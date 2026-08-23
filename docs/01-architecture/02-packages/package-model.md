# Package Model

## Purpose

Define what a sealed `@asol/*` package is, how it relates to the application, and the invariants every package must satisfy. Agents use this document before creating or modifying any package under `packages/`.

## Scope

Covers the structural model for all 41 sealed packages registered in `packages/architecture-core/src/registry/capability-registry.ts`. Operational database or deployment procedures are out of scope — see [docs/02-data-and-storage/](../../02-data-and-storage/) and [docs/07-mobile-and-release/](../../07-mobile-and-release/).

## Package anatomy

Every sealed package lives at `packages/<folder>/` and publishes as `@asol/<folder>`.

| Property | Requirement |
|---|---|
| **Registry entry** | Row in `CAPABILITY_PACKAGES` with `folder`, `name`, `owns`, `layer`, `vendorModules`, `mayImportApp` |
| **`package.json` `exports`** | Explicit doors only — never a `"./*"` wildcard |
| **Contract test** | `packages/<folder>/src/tests/index.test.ts` run via `npm run test:<folder>` or collective gate |
| **Independence** | No relative imports from outside into `packages/<folder>/src/**` |
| **App import ban** | Capability packages (`mayImportApp: false`) MUST NOT import `@/…` |

## Package kinds (by layer)

| Layer | Count | Role | `mayImportApp` |
|---|---|---|---|
| `capability` | 33 | Owns one domain or infrastructure capability | `false` |
| `composition` | 6 | Wires capabilities for one deployment account | `true` |
| `declarations` | 1 | Pure account metadata (`@asol/account-declarations`) | `false` |
| `bridge` | 1 | Cross-account device bridging (`@asol/account-bridge`) | `false` |
| `enforcement` | 1 | Architecture contracts and scan (`@asol/architecture-core`) | `false` |

The six composition packages: `@asol/notifications-composition`, `@asol/orders-composition`, `@asol/products-composition`, `@asol/profiles-composition`, `@asol/submain-composition`, `@asol/sub2main-composition`.

## Capability vs composition

**Capability packages** hold sensitive logic once. They declare **ports** for anything they need from the application (identity, HTTP, configuration) and expose **doors** for consumers. They never reach into `src/`.

**Composition packages** are the only packages allowed to import `@/features/*` and `@/core/*`. They assemble capability packages for a single Vercel account deployment under `services/*/`. See [composition-model.md](../04-composition/composition-model.md).

## Mandatory gateways

Some capabilities are **mandatory gateways** — bypassing them is a build failure, not a style preference:

| Gateway | Owner | Why mandatory |
|---|---|---|
| Database | `@asol/data-core` | Sole owner of Drizzle, SQLite, Turso |
| Object storage | `@asol/storage-core` | Sole owner of R2/S3 SDK |
| Native / Capacitor | `@asol/native-core` | Sole owner of every Capacitor plugin |
| Page-authored writes | `@asol/page-save-core` | Single-door gateway for UI persistence |
| Push delivery | `@asol/notifications-core` | Web Push, FCM, APNs |
| OTA | `@asol/ota-core` | Publishing and update runtime |

See [mandatory-gateways.md](../05-capability-enforcement/mandatory-gateways.md).

## Source Map

- Registry: `packages/architecture-core/src/registry/capability-registry.ts`
- Inventory: [package-catalog.md](../08-reference/package-catalog.md)
- Ownership: [capability-map.md](../08-reference/capability-map.md)

## Related Documents

- [Package Layers](./package-layers.md)
- [Package Exports](./package-exports.md)
- [Module Isolation Rules](./module-isolation-rules.md)
- [Package Creation Rules](./package-creation-rules.md)

## Change Impact

Adding or removing a package requires: registry update, `package.json` exports, contract test, root `package.json` `test:*` script, `build`/`build:static` gate inclusion where applicable, and updates to [package-catalog.md](../08-reference/package-catalog.md) and [capability-map.md](../08-reference/capability-map.md).

## Invariants

1. Every folder under `packages/` with an `@asol/*` name MUST appear in `CAPABILITY_PACKAGES`.
2. Unregistered packages fail `npm run architecture:check`.
3. Capability packages MUST NOT import application code.
4. Only declared `exports` doors are importable — enforced at resolution, ESLint, and scan time.
