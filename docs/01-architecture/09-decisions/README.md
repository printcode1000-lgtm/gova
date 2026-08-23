# Architecture Decision Records

## Purpose

Index of ADRs capturing significant architectural decisions. Agents consult ADRs when changing boundaries established by consolidation work.

## Scope

Decisions affecting sealed packages, enforcement, branching, and application structure. Operational runbooks remain in other `docs/` domains.

## ADR index

| ID | Title | Status |
|---|---|---|
| [ADR-0001](./ADR-0001-consolidation-2026-08.md) | August 2026 capability consolidation (8 packages) | Accepted |
| [ADR-0002](./ADR-0002-capability-consolidation-follow-up.md) | Repository-wide consolidation follow-up | Accepted |
| [ADR-0003](./ADR-0003-srp-file-splits-2026-08.md) | SRP file splits without new packages | Accepted |
| [ADR-0004](./ADR-0004-ui-capability-packages-2026-08.md) | UI-adjacent capability packages | Accepted |
| [ADR-0005](./ADR-0005-sealed-package-model.md) | Sealed package model and nine rules | Accepted |
| [ADR-0006](./ADR-0006-main-only-branch.md) | main is the only branch | Accepted |

## Historical source

Full narrative backups: the pre-reconstruction architecture docs (see git history) (preserved read-only, never modified).

ADRs here are agent-first summaries; backup retains migration detail.

### Backup coverage map (54 files)

| Backup path | Classification | Current location |
|---|---|---|
| `module-isolation-rules.md` | PRESERVED | [02-packages/module-isolation-rules.md](../02-packages/module-isolation-rules.md) |
| `repository-architecture-enforcement.md` | MERGED | [07-enforcement/](../07-enforcement/) |
| `consolidation-2026-08.md` | HISTORICAL → ADR | [ADR-0001](./ADR-0001-consolidation-2026-08.md) |
| `capability-consolidation-2026-08-follow-up.md` | HISTORICAL → ADR | [ADR-0002](./ADR-0002-capability-consolidation-follow-up.md) |
| `srp-file-splits-2026-08.md` | HISTORICAL → ADR | [ADR-0003](./ADR-0003-srp-file-splits-2026-08.md) |
| `ui-capability-core-packages-2026-08.md` | HISTORICAL → ADR | [ADR-0004](./ADR-0004-ui-capability-packages-2026-08.md) |
| `*-core-module.md` (per-package detail) | MOVED | [docs/05-platform-features/sealed-packages/](../../05-platform-features/sealed-packages/) (12 packages) + [08-reference/](../08-reference/) summaries |
| `data-layers/01-09`, `19` | PRESERVED | [10-application-layers/](../10-application-layers/) |
| `data-layers/10-cache-rules-and-data-flow.md` | MOVED | [docs/02-data-and-storage/cache-rules-and-data-flow.md](../../02-data-and-storage/cache-rules-and-data-flow.md) |
| `data-layers/11-current-databases.md` | MOVED | [docs/02-data-and-storage/current-databases.md](../../02-data-and-storage/current-databases.md) |
| `data-layers/14-environment-variables.md` | MOVED | [docs/02-data-and-storage/environment-variables.md](../../02-data-and-storage/environment-variables.md) |
| `data-layers/16-deployment-targets.md` | MOVED | [docs/07-mobile-and-release/deployment-targets.md](../../07-mobile-and-release/deployment-targets.md) |
| `data-layers/22-scripts-and-workflows.md` | MOVED | [docs/07-mobile-and-release/scripts-and-workflows.md](../../07-mobile-and-release/scripts-and-workflows.md) |
| `data-layers/25-central-data-access-module.md` | MOVED | [docs/02-data-and-storage/central-data-access.md](../../02-data-and-storage/central-data-access.md) |
| `data-layers/26-cloud-accounts.md` | MOVED | [docs/06-super-admin-and-operations/cloud-accounts-architecture.md](../../06-super-admin-and-operations/cloud-accounts-architecture.md) |
| `release-and-secrets-modules.md` | MOVED | [docs/07-mobile-and-release/release-and-secrets.md](../../07-mobile-and-release/release-and-secrets.md) |
| `map-core-module.md` | MOVED | [docs/05-platform-features/map-core-module.md](../../05-platform-features/map-core-module.md) |
| `auth-core-module.md` | MOVED | [docs/05-platform-features/auth-core-module.md](../../05-platform-features/auth-core-module.md) |
| `native-core-module.md` | MOVED | [docs/07-mobile-and-release/capacitor/native-core-module.md](../../07-mobile-and-release/capacitor/native-core-module.md) |
| `branding-core-module.md` | MOVED | [docs/07-mobile-and-release/capacitor/branding-core-module.md](../../07-mobile-and-release/capacitor/branding-core-module.md) |
| Remaining `*-core-module.md` (13 packages) | MERGED | [08-reference/package-catalog.md](../08-reference/package-catalog.md) + [capability-map.md](../08-reference/capability-map.md) |
| `data-layers/12-input-validation.md` | PRESERVED | [10-application-layers/input-validation.md](../10-application-layers/input-validation.md) |
| `data-layers/13-configuration-layer.md` | PRESERVED | [10-application-layers/configuration-layer.md](../10-application-layers/configuration-layer.md) |
| `data-layers/15-security-rules.md` | PRESERVED | [10-application-layers/security-rules.md](../10-application-layers/security-rules.md) |
| `data-layers/17-extending-features.md` | PRESERVED | [10-application-layers/extending-features.md](../10-application-layers/extending-features.md) |
| `data-layers/18-testability.md` | PRESERVED | [10-application-layers/testability.md](../10-application-layers/testability.md) |
| `data-layers/20-schema-provisioning.md` | MOVED | [docs/02-data-and-storage/schema-provisioning.md](../../02-data-and-storage/schema-provisioning.md) |
| `data-layers/21-operation-monitor.md` | MOVED | [docs/06-super-admin-and-operations/operation-monitor.md](../../06-super-admin-and-operations/operation-monitor.md) |
| `data-layers/23-file-map.md` | PRESERVED | [08-reference/file-map.md](../08-reference/file-map.md) |
| `data-layers/24-runtime-context.md` | PRESERVED | [06-runtime-boundaries/runtime-context.md](../06-runtime-boundaries/runtime-context.md) |
| `data-layers/profile-system.md` | MOVED | [docs/02-data-and-storage/profile-system.md](../../02-data-and-storage/profile-system.md) |
| `architecture-core-module.md` | MERGED | [07-enforcement/architecture-core-module.md](../07-enforcement/architecture-core-module.md) |
| `asol-db-system.md` | MOVED | [docs/02-data-and-storage/asol-db-system.md](../../02-data-and-storage/asol-db-system.md) |
| `dev-core-module.md` | MOVED | [docs/02-data-and-storage/dev-core-module.md](../../02-data-and-storage/dev-core-module.md) |

## When to add an ADR

- New sealed package category or layer change
- New mandatory gateway
- Enforcement model change (e.g. new scan phase)
- Branch/release policy change

## Related Documents

- [Architecture Principles](../01-principles/architecture-principles.md)
- [Module Isolation Rules](../02-packages/module-isolation-rules.md)
- [README.md](../README.md)

## Change Impact

New ADR requires index update here and cross-links from affected topic docs.

## Invariants

ADRs are not retroactive permission to bypass current enforcement — code and docs must match accepted decisions.
