# Infrastructure Ownership

## Purpose

Map external SDKs and infrastructure to their sole owning packages. Agents MUST NOT import vendor modules outside the registered owner.

## Scope

All modules in `vendorModules` across `CAPABILITY_PACKAGES` plus `ROOT_VENDOR_OWNED_FILES`. Capability ownership statements: [capability-map.md](../08-reference/capability-map.md).

## Ownership registry

Derived list: `OWNED_VENDOR_MODULES` in `packages/architecture-core/src/registry/capability-registry.ts`.

| Vendor module | Owner package | Capability |
|---|---|---|
| `better-sqlite3` | `@asol/data-core` | Local SQLite |
| `@libsql/client` | `@asol/data-core` | Turso remote |
| `drizzle-orm`, `drizzle-orm/better-sqlite3`, `drizzle-orm/libsql` | `@asol/data-core` | Query layer |
| `@aws-sdk/client-s3` | `@asol/storage-core`, `@asol/ota-core` | Product media vs OTA artifacts (dual ownership, distinct jobs) |
| `@aws-sdk/s3-request-presigner` | `@asol/storage-core` | Presigned URLs |
| `@capacitor/cli`, `@capacitor/core`, all `@capacitor/*` plugins listed in registry | `@asol/native-core` | Native shell |
| `@capacitor-mlkit/barcode-scanning` | `@asol/native-core` | Barcode |
| `@capawesome/capacitor-file-picker`, `@capgo/capacitor-speech-recognition` | `@asol/native-core` | Plugins |
| `web-push` | `@asol/notifications-core` | Web Push |
| `google-auth-library` | `@asol/notifications-core`, `@asol/ota-core` | FCM / Play auth |
| `maplibre-gl` | `@asol/map-core` | Maps |
| `sharp` | `@asol/branding-core` | Icon generation |

Packages with empty `vendorModules` own pure logic or ports only — no direct infrastructure SDK.

## Root-owned files

| File | Owner |
|---|---|
| `capacitor.config.ts` | `native-core` (`ROOT_VENDOR_OWNED_FILES`) |

## Dual ownership

When two packages share a vendor (e.g. `@aws-sdk/client-s3` for storage vs OTA), **both** MUST remain registered. The scan allows either owner to import; all other packages are rejected.

## Enforcement

`checkVendorOwnershipContract(file, content)` runs on every scanned file. ESLint adds fast-fail patterns for high-risk modules (DB drivers, Capacitor).

## Operational links

| Infrastructure | Architecture owner | Operations doc |
|---|---|---|
| Turso / SQLite | `@asol/data-core` | [docs/02-data-and-storage/](../../02-data-and-storage/) |
| Cloudflare R2 | `@asol/storage-core` | [docs/02-data-and-storage/](../../02-data-and-storage/) |
| Vercel accounts | `@asol/vercel-deploy-core` | [super-admin-cloud-accounts.md](../../06-super-admin-and-operations/super-admin-cloud-accounts.md) |
| Capacitor / mobile | `@asol/native-core` | [docs/07-mobile-and-release/](../../07-mobile-and-release/) |

## Source Map

- Registry: `packages/architecture-core/src/registry/capability-registry.ts`
- Check: `packages/architecture-core/src/checks/vendor-ownership-contract.ts`
- ESLint: `eslint.config.js`

## Related Documents

- [Mandatory Gateways](./mandatory-gateways.md)
- [Default Deny Model](./default-deny-model.md)
- [Forbidden Dependencies](../03-dependencies/forbidden-dependencies.md)

## Change Impact

Adding a new vendor SDK requires registry `vendorModules` update, ESLint pattern if needed, and capability-map update.

## Invariants

1. No parallel list of vendors — registry is sole source (`OWNED_VENDOR_MODULES` is derived).
2. Unregistered vendor import in scanned paths fails architecture check.
3. Infrastructure final side effects trace to one owner per job.
