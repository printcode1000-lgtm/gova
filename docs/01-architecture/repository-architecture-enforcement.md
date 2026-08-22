# Repository-wide Architecture Enforcement

This document is the standing description of how capability ownership is
**technically enforced** across the repository. It complements
[module-isolation-rules.md](./module-isolation-rules.md) and
[architecture-core-module.md](./architecture-core-module.md).

## Final invariant

> Every significant capability has exactly one architectural owner, one controlled
> public contract, and no unauthorized alternative implementation path.

If a developer or coding agent tries to bypass an owning package, `npm run architecture:check`
must reject that architecture.

## Ownership registry

`packages/architecture-core/src/registry/capability-registry.ts` is the single inventory of:

| Field | Meaning |
| :--- | :--- |
| `folder` / `name` | Sealed package identity |
| `owns` | The capability statement |
| `layer` | `capability` · `composition` · `declarations` · `bridge` · `enforcement` |
| `vendorModules` | SDKs this package alone may import |
| `mayImportApp` | Whether production source may import `@/` |

A package that exists on disk but is missing from the registry fails the check.
A registry entry that points at a missing folder fails the check.
Wildcard `exports` (`./*`) fail the check.

### Derived vendor list

`OWNED_VENDOR_MODULES` is **derived** from every package's `vendorModules`. There is no
parallel hand-maintained list — a vendor present only in a hardcoded array would be
unenforceable against its real owner, and a vendor present only on a package would be
invisible to the ownership scan.

Dual ownership is intentional where two capabilities share one SDK for distinct jobs
(for example `@aws-sdk/client-s3` for product media vs OTA artifacts, and
`google-auth-library` for FCM HTTP v1 vs Google Play). Both owners must remain registered.
`firebase-admin` is **not** a production path and is not registered as an owner SDK.

### Root vendor-owned files

Some repository-root files are not under `packages/<owner>/` but still belong to a
capability for vendor-import purposes. They are listed in `ROOT_VENDOR_OWNED_FILES`
(currently `capacitor.config.ts` → `native-core`) and are scanned by the runner.

## Mandatory gateways (examples)

| Capability | Owner | Forbidden bypass |
| :--- | :--- | :--- |
| Database / SQL / Turso / SQLite | `@asol/data-core` | Direct `better-sqlite3`, `@libsql/client`, `drizzle-orm` (including via `nodeRequire` / `createRequire`) |
| Object storage (R2/S3) | `@asol/storage-core` | Direct `@aws-sdk/client-s3` outside owned adapters |
| Push delivery | `@asol/notifications-core` | Direct `web-push` / `google-auth-library` outside that package (and ota-core for Play) |
| OTA + Google Play auth client | `@asol/ota-core` | Direct `google-auth-library` / S3 SDK in app modules |
| Native / Capacitor | `@asol/native-core` | Direct `@capacitor/*` (and related) outside native-core — including other packages' tests |
| Page-authored persistence | `@asol/page-save-core` | Deep imports or writes outside the registered surface |
| Branding icons | `@asol/branding-core` | Ad-hoc icon generators outside the package |

## Vendor ownership and tests

Vendor SDKs may be imported only by their owning package(s). **Tests are not exempt**
unless the test file itself lives under an owning package. A foreign package's tests
constructing `better-sqlite3` (or any other owned SDK) is treated as the same bypass
as production code. Prefer `node:sqlite` or a port/fake when a non-owner package needs
an in-memory database in tests.

`extractImports` is statement-boundary aware and also resolves `nodeRequire(...)` and
`createRequire(...)("pkg")`, so lazy driver loading cannot hide a vendor import inside
a string fixture or an alias require.

## Page-save write surface

`checkPageSaveGatewayContract` freezes the write-surface `skippedDirectories` set to
exactly `node_modules`, `tests`, `__tests__`, `api`.

`api` is excluded because HTTP route handlers persist through domain/data owners, not
through page-save. Expanding that set is an architectural decision and must update this
document in the same change.

## Composition root

Application wiring lives in `src/core/composition/` (and account `*-composition` packages).
Capability packages declare ports; composition registers implementations. Capability packages
must not import `@/`.

## Enforcement layers

1. Package `exports` maps (no deep doors).
2. ESLint `no-restricted-imports` (vendors + deep `@asol/*/src/**`, including Capacitor
   bans in packages other than `native-core`).
3. `npm run architecture:check` — registry ownership, package seal, vendor ownership
   (including tests and root owned files), package↔app import boundary, page-save gateway,
   plus existing layer contracts.
4. Per-package `test:*-core` gates (including page-save ownership / write-surface).

## Adding a package

1. Create `packages/<name>` with an explicit `exports` map.
2. Register it in `capability-registry.ts` with layer, ownership statement, and vendors.
3. Keep `mayImportApp: true` only for `*-composition` packages.
4. Run `npm run architecture:check` and the package's `test:*-core`.
