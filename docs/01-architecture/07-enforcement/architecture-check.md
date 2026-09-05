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

GitHub Actions does not run this check as general app CI. Remote workflows are limited to path-filtered docs validation and an OIDC-only production deploy dispatcher that runs no repository correctness commands. See [github-ci-policy.md](../../07-mobile-and-release/github-ci-policy.md).

## CLI preflight (application-specific)

Before scan, `scripts/architecture-check.ts` runs:

| Preflight | Source |
|---|---|
| Runtime compatibility reference | `scripts/runtime-compatibility-reference.ts` |
| Generated Build/Test gate contract | `scripts/generated-gate-contract.ts` |
| GitHub CI policy | `scripts/github-ci-policy.ts` |
| Agent knowledge documentation | `scripts/docs/check.ts` |
| Storage profiles validation | `@asol/storage-core/server` `validateStorageProfilesAtStartup()` |
| Category data validation | `src/features/categories/infrastructure/validation.engine.ts` |

Adding a package is therefore three edits, not one: the folder itself, an entry in
`capability-registry.ts`, and its `workspacePackages` line in
`config/runtime-compatibility-reference.json`. Missing the third fails the very
first preflight with "is new and has not been compatibility-reviewed", and
deleting a package without removing its line fails the same preflight with "is
missing from the current repository".

These stay in the CLI because `@asol/architecture-core` MUST NOT import application data (would violate the rules it enforces).

## Scan phases (`runArchitectureCheck`)

| Order | Check | Scope |
|---|---|---|
| 1 | `checkCapabilityOwnershipContract` | Registry ↔ disk parity for `@asol/*` |
| 2 | `checkApplicationFeatureRegistryContract` | `APPLICATION_FEATURES` ↔ `src/features/*`; forbidden roots (`src/modules`, …) |
| 3 | `checkPackageCycleContract` | Circular `@asol/*` deps |
| 4 | `checkApplicationCycleContract` | Every discovered `features/shared/core` cluster; rejects new/changed cyclic components and reports exact added/removed cyclic edges inside the audited pre-existing baseline |
| 5 | `checkPageSaveGatewayContract` | Single-door page-save |
| 6 | `checkPageSaveWriteGatewayContract` | Write ownership |
| 7 | `checkRepositorySweepContract` | Default-deny sweep over the whole tree |
| 8 | `checkIsolatedDeploymentBackendContract` | Every account composition root pins its backend |
| 8 | `checkRuntimeTargetContract` | No `force-dynamic` page inside the static export |
| 9 | `checkFeatureDoorContract` | Cross-feature imports only through declared doors |
| 10 | `checkFeatureDependencyContract` | Actual vs declared feature deps; no stale/unknown edges |
| 11 | `checkFeatureApplicationDoorPurityContract` | Application doors stay isomorphic (no browser/server poison) |
| 12 | `checkArchitectureDocsDriftContract` | Generated reference docs match registries |
| 13 | `checkCorsContract` | Central CORS ownership and policy boundary |
| 14 | `checkApiTransportContract` | Project-wide owned JSON camelCase, contract-wrapper coverage, raw-row/SQL leakage, and explicit provider-protocol allowlists |
| 15 | `checkVendorOwnershipContract` | Root vendor-owned files (`capacitor.config.ts`) |
| 16 | Walk `src/` → `checkFile`, seal, system-logs, vendor | Application source |
| 17 | Walk `packages/` → seal, app-import ban, vendor | Package source |
| 18 | Walk `scripts/` → data-access ownership, account-bridge, seal, vendor | Tooling |
| 19 | `checkTouchInteractionContract`, `checkMapLibreWorkerContract` | UI policy |
| 20 | `checkGeneratedDataAccessArtifacts` | Generated data-access artifacts |
| 21 | `checkSystemLogsBootstrapContract` | Logging bootstrap |
| 22 | `checkDeadContractRules` | Rules whose subject no longer exists |
| 23 | Walk `services/` → bridge, seal, vendor, notification contract | Account services (skips `generated/`) |
| 24 | `printReport`, then `reportNativeSurface` | Verdict, then store-release cost |

SOURCE_OF_TRUTH → `packages/architecture-core/src/runner.ts`. Every check above is
named exactly as it is exported, so an agent can search for it directly.

Generated-document drift is semantic and cross-platform: the checker normalizes `LF` and `CRLF`
before deciding whether generated reference content differs. A Windows checkout therefore cannot
fail only because Git converted line endings, while any real content difference still fails.

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
