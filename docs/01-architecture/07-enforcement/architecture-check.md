# Architecture Check

## Purpose

Document `npm run architecture:check` — the repository-wide static scan that enforces sealed packages, gateways, vendor ownership, and architectural contracts.

## Scope

CLI wrapper and `@asol/architecture-core` scan. Not a substitute for `npm run build` — build runs additional package tests.

## Command chain

```bash
npm run architecture:check
# → npx tsx scripts/architecture-check.ts
# → runArchitectureCheck() from @asol/architecture-core
```

Included in: `npm run build`, `npm run build:static`, `verify:*` scripts.

**No GitHub Actions** — `.github/workflows` is empty. Vercel and local developers run the same npm gates.

## CLI preflight (application-specific)

Before scan, `scripts/architecture-check.ts` runs:

| Preflight | Source |
|---|---|
| Storage profiles validation | `@asol/storage-core/server` `validateStorageProfilesAtStartup()` |
| Category data validation | `src/features/categories/infrastructure/validation.engine.ts` |

These stay in the CLI because `@asol/architecture-core` MUST NOT import application data (would violate the rules it enforces).

## Scan phases (`runArchitectureCheck`)

| Order | Check | Scope |
|---|---|---|
| 1 | `checkCapabilityOwnershipContract` | Registry ↔ disk parity |
| 2 | `checkPackageCycleContract` | Circular `@asol/*` deps |
| 3 | `checkPageSaveGatewayContract` | Single-door page-save |
| 4 | `checkPageSaveWriteGatewayContract` | Write ownership |
| 5 | `checkRepositorySweepContract` | Default-deny sweep over the whole tree |
| 6 | `checkIsolatedDeploymentBackendContract` | Every account composition root pins its backend; each `better-sqlite3` stub names its own service |
| 7 | `checkRuntimeTargetContract` | No `force-dynamic` page inside the static export (see [runtime-targets.md](../06-runtime-boundaries/runtime-targets.md)) |
| 8 | `checkVendorOwnershipContract` | Root vendor-owned files (`capacitor.config.ts`) |
| 9 | Walk `src/` → `checkFile`, `checkPackageSealContract`, `checkSystemLogsContract`, `checkVendorOwnershipContract` | Application source |
| 10 | Walk `packages/` → `checkPackageSealContract`, `checkPackageAppImportContract`, `checkVendorOwnershipContract` | Package source |
| 11 | Walk `scripts/` → `checkExternalDataAccessOwnership`, `checkAccountBridgeContract`, `checkPackageSealContract`, `checkVendorOwnershipContract` | Tooling |
| 12 | `checkTouchInteractionContract`, `checkMapLibreWorkerContract` | UI policy |
| 13 | `checkGeneratedDataAccessArtifacts` | Generated data-access artifacts |
| 14 | `checkSystemLogsBootstrapContract` | Logging bootstrap |
| 15 | `checkDeadContractRules` | Rules whose subject no longer exists |
| 16 | Walk `services/` → `checkAccountBridgeContract`, `checkPackageSealContract`, `checkVendorOwnershipContract`, `checkNotificationModuleContract` | Account services (skips `generated/`) |
| 17 | `printReport`, then `reportNativeSurface` | Verdict, then store-release cost |

SOURCE_OF_TRUTH → `packages/architecture-core/src/runner.ts`. Every check above is
named exactly as it is exported, so an agent can search for it directly.

## When check fails

1. Read violation output — lists rule name, file, message
2. Consult [enforcement-exceptions.md](./enforcement-exceptions.md) — likely no waiver
3. Fix import path to declared door or move code to owner package
4. Re-run: `npm run architecture:check`

## Source Map

- CLI: `scripts/architecture-check.ts`
- Runner: `packages/architecture-core/src/runner.ts`
- Checks: `packages/architecture-core/src/checks/`
- Contracts: `packages/architecture-core/src/contracts/`

## Related Documents

- [Package Sealing](./package-sealing.md)
- [Import Enforcement](./import-enforcement.md)
- [Architecture Tests](./architecture-tests.md)

## Change Impact

New rules belong in `architecture-core` checks + contract tests, not ad-hoc scripts.

## Invariants

1. Scan walks `packages/` — packages are not exempt from rule 5.
2. `architecture-core` contract/registry files are excluded from self-violation.
3. Preflight failures abort before walk.
