# Forbidden Dependencies

## Purpose

Explicit anti-patterns that fail ESLint, `architecture:check`, or build gates. Agents MUST avoid these imports — there is no waiver path except documented exceptions.

## Scope

Import and dependency anti-patterns across `src/`, `packages/`, `scripts/`, and `services/`.

## Package import bans

| Forbidden | Reason | Enforcement |
|---|---|---|
| `@asol/<pkg>/src/**` | Deep import bypasses seal | ESLint + `checkPackageSealContract` |
| `**/packages/<pkg>/**` from outside | Relative traversal into packages | ESLint + seal contract |
| `@asol/data-core/src/**` | Deep data-core | ESLint explicit pattern |
| `@asol/orders-core/**` (subpaths) | Single-door order domain | ESLint |
| `@asol/native-core/src/**` | Deep native | ESLint (doors `.` and `./platform-globals` allowed) |
| `@asol/storage-core/src/**`, `./server/**` deep | Storage seal | ESLint |
| `@asol/*-composition/*` subpaths | Composition seal | ESLint |
| Wildcard `@asol/foo/*` via tsconfig paths | Defeats export maps | architecture tests + manual review |

## Vendor SDK bans (outside owner)

| Forbidden import | Owner only |
|---|---|
| `better-sqlite3`, `@libsql/client`, `drizzle-orm`, `@libsql/*`, `drizzle-orm/*` | `@asol/data-core` |
| `@capacitor/*`, `@capawesome/*`, `@capgo/*`, `@capacitor-mlkit/*` | `@asol/native-core` |
| Direct `fetch` in client services | Use `asol-http-transport.ts` |
| `localStorage`, `indexedDB` globals | Use `@asol/data-core/browser` adapters |

ESLint messages cite the owning package. Scan: `checkVendorOwnershipContract`.

## Application layer bans

| Layer | Forbidden imports |
|---|---|
| UI / Hooks | Repository, Drizzle, `@libsql/*`, `better-sqlite3`, server services |
| Client components | `server-only` modules |
| Client services | Raw `fetch`, SQL, repository |
| Business API routes | Direct repository, operations layer skip |
| Any browser bundle | Node builtins (`fs`, `path`, `child_process`) in OTA runtime paths |

## Legacy path bans

ESLint blocks imports from consolidated legacy locations:

- `@/features/ota/**` → use `@asol/ota-core` or `@asol/ota-core/publishing`
- `scripts/ota/**`, `scripts/ota-publish/**`, `scripts/build-static/**` (as import targets)

## Package-internal bans

| Package | Forbidden |
|---|---|
| `ota-core` runtime half | `fs`, `path`, `child_process`, `./publishing` from runtime files |
| Capability packages | Any `@/…` import |
| `account-declarations` | Any import whatsoever |
| Non-composition packages | `mayImportApp` is false — no `@/` |

## Capability bypass bans

| Bypass attempt | Mandatory gateway |
|---|---|
| Direct SQL or Drizzle outside data-core | `@asol/data-core` |
| Direct S3/R2 SDK outside storage-core | `@asol/storage-core` |
| Direct Capacitor outside native-core | `@asol/native-core` |
| Page UI writing persistence outside page-save | `@asol/page-save-core` |
| Direct web-push or FCM outside notifications-core | `@asol/notifications-core` |

Detail: [bypass-prevention.md](../05-capability-enforcement/bypass-prevention.md).

## Source Map

- ESLint: `eslint.config.js` — sections `@asol/native-core`, `@asol/ota-core`, data-access
- Seal: `packages/architecture-core/src/checks/package-seal-contract.ts`
- App import: `packages/architecture-core/src/checks/package-app-import-contract.ts`
- Native/data scripts: `packages/architecture-core/src/checks/native-contract.ts`

## Related Documents

- [Allowed Dependencies](./allowed-dependencies.md)
- [Import Enforcement](../07-enforcement/import-enforcement.md)
- [Default Deny Model](../05-capability-enforcement/default-deny-model.md)

## Change Impact

Removing a forbidden pattern requires proving the capability owner now covers the use case — not adding an ESLint disable.

## Invariants

1. Empty catch blocks and silent `.catch(() => undefined)` without logging are forbidden (system-logs contract).
2. No per-file architecture waivers.
3. Forbidden patterns fail `npm run build` — not advisory warnings.
