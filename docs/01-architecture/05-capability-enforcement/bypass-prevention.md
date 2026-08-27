# Bypass Prevention

## Purpose

Document how the repository prevents alternate paths around mandatory gateways and sealed packages.

## Scope

Static and test-based bypass prevention. Runtime security (auth, CSRF) is separate — see application security docs under `docs/`.

## Prevention layers

| Layer | What it prevents |
|---|---|
| `exports` maps | Deep imports into package internals |
| ESLint `no-restricted-imports` | Known bypass patterns (DB drivers, Capacitor, legacy OTA paths) |
| `architecture:check` | Vendor ownership, seal violations, page-save gateway, cycles, app imports in packages |
| Contract tests | Export surface drift, write-surface allowlists, composition task absence |
| Build chain | No merge-to-production path skipping gates (`npm run build`) |

## Gateway-specific prevention

### Database bypass

- ESLint blocks `better-sqlite3`, `@libsql/client`, `drizzle-orm` in `src/` and `scripts/`
- `checkExternalDataAccessOwnership` rejects DB code in scripts
- `checkGeneratedDataAccessArtifacts` guards generated paths
- Browser/runtime policy rejects DB construction in client bundles

### Storage bypass

- `@aws-sdk/client-s3` only in `storage-core` and `ota-core` (registered dual owners)
- Deep `@asol/storage-core/src/**` blocked by ESLint

### Native bypass

- All `@capacitor/*` imports blocked outside `native-core` (with explicit door exceptions)
- `capacitor.config.ts` scanned under native ownership

### Page-save bypass

- `checkPageSaveGatewayContract` — single door
- `checkPageSaveWriteGatewayContract` — write path ownership
- `page-save-write-surface.test.ts` — AST allowlist of directories that may write
- Expanding skip set requires doc update (comment in gateway contract)

### OTA bypass

- ESLint redirects `@/features/ota/**` to `@asol/ota-core`
- Runtime half cannot import Node builtins

### Notification bypass

- `checkNotificationModuleContract` on `services/notifications/src`
- `contracts/notification-contract.ts` defines allowed entry points

## Touch interaction bypass

`checkTouchInteractionContract` forbids `hover:`, `cursor-pointer`, and DOM `title` attributes in `src/` and `packages/` — mobile touch policy.

## System logs bypass

`checkSystemLogsContract` and bootstrap contract reject empty catches and legacy log repository imports — zero silent failure.

## No GitHub Actions escape hatch

General GitHub correctness CI is forbidden. The allowed workflows are the path-filtered docs workflow and the `main` deployment dispatcher. The dispatcher has no checkout, shell commands, or secrets; it may only obtain GitHub OIDC and call the fixed production endpoint, which verifies repository, workflow, ref, event, and SHA claims. Correctness remains local npm scripts and `deploy:all` preflight. Local `npm run github:ci-policy` rejects wider triggers, actions, commands, or secret access. See [github-ci-policy.md](../../07-mobile-and-release/github-ci-policy.md).

## Source Map

- Runner orchestration: `packages/architecture-core/src/runner.ts`
- Individual checks: `packages/architecture-core/src/checks/`
- ESLint: `eslint.config.js`

## Related Documents

- [Mandatory Gateways](./mandatory-gateways.md)
- [Import Enforcement](../07-enforcement/import-enforcement.md)
- [Architecture Check](../07-enforcement/architecture-check.md)

## Change Impact

New bypass surface requires new check in `architecture-core` or ESLint — not documentation alone.

## Invariants

1. Four enforcement layers remain independent (see module isolation rules).
2. Gateway bypass fails build — not warning.
3. Write-surface expansion is an architectural decision with test + doc update.
