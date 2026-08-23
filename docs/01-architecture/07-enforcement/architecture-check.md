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
| Category data validation | `src/features/categories/infrastructure/validation.engine` |

These stay in the CLI because `@asol/architecture-core` MUST NOT import application data (would violate the rules it enforces).

## Scan phases (`runArchitectureCheck`)

| Order | Check | Scope |
|---|---|---|
| 1 | `checkCapabilityOwnershipContract` | Registry ↔ disk parity |
| 2 | `checkPackageCycleContract` | Circular `@asol/*` deps |
| 3 | `checkPageSaveGatewayContract` | Single-door page-save |
| 4 | `checkPageSaveWriteGatewayContract` | Write ownership |
| 5 | `checkRepositorySweepContract` | Repository layer rules |
| 6 | Root vendor files | `capacitor.config.ts` |
| 7 | Walk `src/` | Seal, system logs, vendor ownership, native |
| 8 | Walk `packages/` | Seal, app-import ban, vendor |
| 9 | Walk `scripts/` | Data access, account bridge, seal |
| 10 | Touch + MapLibre contracts | UI policy |
| 11 | Generated data-access artifacts | |
| 12 | System logs bootstrap | |
| 13 | Walk `services/` | Seal, vendor, notification module |
| 14 | Dead contract rules | |
| 15 | `printReport` + native surface report | |

Exit code: `0` pass, `1` violations printed.

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
