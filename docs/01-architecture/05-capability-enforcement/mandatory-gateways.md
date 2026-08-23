# Mandatory Gateways

## Purpose

List capabilities whose bypass is forbidden by static enforcement. Agents MUST route through these packages for the listed operations.

## Scope

Gateway capabilities with explicit scan and/or ESLint enforcement. Ownership detail: [capability-map.md](../08-reference/capability-map.md).

## Gateways

### `@asol/data-core` — Database

**Owns:** Drizzle ORM, `better-sqlite3`, `@libsql/client`, sharding, domain repositories, browser IndexedDB adapter.

**33 export doors** including `./browser`, `./provisioning`, `./tooling`, and per-domain slices.

**Enforcement:** ESLint bans DB drivers outside data-core; `checkExternalDataAccessOwnership`; vendor ownership registry.

**Operational detail:** [docs/02-data-and-storage/](../../02-data-and-storage/)

### `@asol/storage-core` — Object storage (R2/S3)

**Owns:** `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, storage profiles.

**Doors:** `.`, `./server`, `./profiles-config`.

**Enforcement:** ESLint deep-path ban; storage contract checks; startup profile validation in server composition root.

### `@asol/native-core` — Capacitor / native

**Owns:** All `@capacitor/*`, `@capawesome/*`, `@capgo/*`, `@capacitor-mlkit/*` plugins; root `capacitor.config.ts`.

**Doors:** `.`, `./platform-globals`, `./scripts/validate-android-r8-policy`.

**Enforcement:** ESLint Capacitor import ban outside native-core; `checkNativeContract`; vendor registry.

### `@asol/page-save-core` — Page-authored persistence

**Owns:** Mandatory gateway for UI-initiated writes (forms, editors, local state flush).

**Single door:** `.` only — enforced by `checkPageSaveGatewayContract`.

**Additional tests:** `test:page-save-core` includes write-surface and ownership tests under `src/features/page-save/tests/`.

### `@asol/notifications-core` — Push delivery

**Owns:** Web Push, FCM HTTP v1, APNs; `web-push`, `google-auth-library`.

**Doors:** `.`, `./server`, `./builder`, `./providers`.

**Enforcement:** Notification module contract; `test:notifications` suite in build chain.

### `@asol/ota-core` — OTA publishing and runtime

**Owns:** Update runtime, publishing to R2, Play integration paths.

**Doors:** `.`, `./publishing`, `./server`.

**Enforcement:** ESLint runtime/publishing split; legacy path bans for `@/features/ota`.

## Gateway decision tree

| Need | Use | Never |
|---|---|---|
| SQL / Drizzle / Turso | `@asol/data-core/<domain>` | Direct driver import |
| Upload / presign R2 | `@asol/storage-core` | `@aws-sdk/client-s3` in app |
| Camera, GPS, push token native | `@asol/native-core` | `@capacitor/*` in app |
| Save from page UI | `@asol/page-save-core` | Direct repository from component |
| Send push | `@asol/notifications-core` | `web-push` in route |
| Publish OTA bundle | `@asol/ota-core/publishing` | `scripts/ota-publish` imports |

## Source Map

- Registry vendorModules: `capability-registry.ts`
- Page-save gateway: `checks/page-save-gateway-contract.ts`, `checks/page-save-write-gateway-contract.ts`
- Native: `checks/native-contract.ts`
- Notifications: `contracts/notification-contract.ts`

## Related Documents

- [Bypass Prevention](./bypass-prevention.md)
- [Infrastructure Ownership](./infrastructure-ownership.md)
- [Default Deny Model](./default-deny-model.md)

## Change Impact

Weakening a gateway requires ADR, enforcement code change, and test updates — not an ESLint disable.

## Invariants

1. Each gateway has exactly one owner package in the registry.
2. `page-save-core` MUST remain single-door.
3. Gateway bypass attempts fail `npm run architecture:check` or ESLint.
