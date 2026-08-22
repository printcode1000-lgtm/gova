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

## Mandatory gateways (examples)

| Capability | Owner | Forbidden bypass |
| :--- | :--- | :--- |
| Database / SQL / Turso / SQLite | `@asol/data-core` | Direct `better-sqlite3`, `@libsql/client`, `drizzle-orm` |
| Object storage (R2/S3) | `@asol/storage-core` | Direct `@aws-sdk/client-s3` outside owned adapters |
| Push delivery | `@asol/notifications-core` | Direct `web-push` / `firebase-admin` |
| OTA + Google Play auth client | `@asol/ota-core` | Direct `google-auth-library` in app modules |
| Native / Capacitor | `@asol/native-core` | Direct `@capacitor/*` in app code |
| Page-authored persistence | `@asol/page-save-core` | Deep imports or writes outside the registered surface |
| Branding icons | `@asol/branding-core` | Ad-hoc icon generators outside the package |

## Composition root

Application wiring lives in `src/core/composition/` (and account `*-composition` packages).
Capability packages declare ports; composition registers implementations. Capability packages
must not import `@/`.

## Enforcement layers

1. Package `exports` maps (no deep doors).
2. ESLint `no-restricted-imports` (vendors + deep `@asol/*/src/**`).
3. `npm run architecture:check` — registry ownership, package seal, vendor ownership,
   package↔app import boundary, page-save gateway, plus existing layer contracts.
4. Per-package `test:*-core` gates (including page-save ownership / write-surface).

## Adding a package

1. Create `packages/<name>` with an explicit `exports` map.
2. Register it in `capability-registry.ts` with layer, ownership statement, and vendors.
3. Keep `mayImportApp: true` only for `*-composition` packages.
4. Run `npm run architecture:check` and the package's `test:*-core`.
