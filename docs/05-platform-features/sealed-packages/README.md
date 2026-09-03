# Sealed Package Module Documentation

## Purpose

Per-package operational and boundary documentation, relocated here during the 2026-08 architecture reconstruction. Agents consult these for package-specific file maps, execution flows, and extension contracts.

## Scope

Detailed module docs for sealed `@asol/*` packages. Canonical ownership summaries: [capability-map.md](../../01-architecture/08-reference/capability-map.md) and [package-catalog.md](../../01-architecture/08-reference/package-catalog.md).

## Module index

| Package | Document |
|---|---|
| `@asol/catalog-core` | [catalog-core-module.md](./catalog-core-module.md) |
| `@asol/cors` | [cors-module.md](./cors-module.md) |
| `@asol/data-core` | [data-core-module.md](./data-core-module.md) |
| `@asol/env-core` | [env-core-module.md](./env-core-module.md) |
| `@asol/format-core` | [format-core-module.md](./format-core-module.md) |
| `@asol/observability-core` | [observability-core-module.md](./observability-core-module.md) |
| `@asol/orders-core` | [orders-core-module.md](./orders-core-module.md) |
| `@asol/ota-core` | [ota-core-module.md](./ota-core-module.md) |
| `@asol/product-core` | [product-core-module.md](./product-core-module.md) |
| `@asol/product-style-core` | [product-style-core-module.md](./product-style-core-module.md) |
| `@asol/service-runtime-core` | [service-runtime-core-module.md](./service-runtime-core-module.md) |
| `@asol/signed-token-core` | [signed-token-core-module.md](./signed-token-core-module.md) |
| `@asol/storage-core` | [storage-core-module.md](./storage-core-module.md) |

Other packages:

| Package | Document |
|---|---|
| `@asol/auth-core` | [auth-core-module.md](../auth-core-module.md) |
| `@asol/map-core` | [map-core-module.md](../map-core-module.md) |
| `@asol/native-core` | [native-core-module.md](../../07-mobile-and-release/capacitor/native-core-module.md) |
| `@asol/branding-core` | [branding-core-module.md](../../07-mobile-and-release/capacitor/branding-core-module.md) |
| `@asol/dev-core` | [dev-core-module.md](../../02-data-and-storage/dev-core-module.md) |
| `@asol/architecture-core` | [architecture-core-module.md](../../01-architecture/07-enforcement/architecture-core-module.md) |

## Related Documents

- [Architecture README](../../01-architecture/README.md)
- [Module Isolation Rules](../../01-architecture/02-packages/module-isolation-rules.md)

## Change Impact

Package boundary changes require updating the matching module doc and canonical maps in the same change.
