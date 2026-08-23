# ADR-0007: Application Feature Consolidation under `src/features`

## Status

Accepted (2026-08)

## Context

Application code was split across competing roots: `src/modules/` (four ops surfaces), `src/features/` (product features), and global buckets (`src/components/`, `src/hooks/`, `src/lib/`, `src/theme/`, `src/locales/`). Architecture metadata for packages lived in `CAPABILITY_PACKAGES`, but application features had no registry, no sealed doors, and no generated reference docs — inventories drifted by hand.

## Decision

1. **Single application feature root.** Every former `src/modules/*` surface moves to `src/features/*`. `src/modules/` is forbidden and fails `architecture:check` if recreated.
2. **Approved `src/` roots only:** `app/`, `core/`, `features/`, `shared/`. Framework root files (`instrumentation.ts`, `proxy.ts`) remain. Competing buckets are removed.
3. **`src/shared/`** holds only cross-feature, domain-neutral code (UI primitives, layouts, brand, i18n, theme, preferences, app-init, installation).
4. **Canonical feature vocabulary.** Prefer `domain/`, `application/`, `infrastructure/`, `presentation/`, `ports/`, `server/`, `tests/`. Top-level `entities/` and `components/` inside a feature are rejected.
5. **`APPLICATION_FEATURES` registry** in `@asol/architecture-core` is the machine-readable source of truth for every `src/features/*` directory (doors, runtime targets, capability owners, permitted dependencies, deep-import seams).
6. **Sealed feature doors.** Cross-feature imports use `@/features/<name>`, `/ui`, or `/server` only. Deep imports require an explicit `deepImportSeams` entry (e.g. notifications → auth).
7. **Generated reference docs.** `capability-map.md`, `package-catalog.md`, `dependency-map.md`, and `application-feature-catalog.md` are generated from registries and verified by `architecture:check` drift detection (`npm run architecture:docs` regenerates).

## Consequences

- Positive: one application shape; default-deny features; no silent doc drift; same sealing idea as package `exports`.
- Negative: door files and the feature registry must be updated when adding a feature or cross-feature edge.
- Supersedes ADR-0002's claim that wiring seams live under `src/modules/`.

## Source Map

- Registry: `packages/architecture-core/src/registry/application-features-registry.ts`
- Checks: `application-features-contract.ts`, `feature-door-contract.ts`, `architecture-docs-drift-contract.ts`
- Docs generator: `packages/architecture-core/src/docs/generate-architecture-docs.ts`
- Attack tests: `scripts/architecture/application-features-attack.test.ts`

## Related Documents

- [ADR-0002](./ADR-0002-capability-consolidation-follow-up.md)
- [ADR-0005](./ADR-0005-sealed-package-model.md)
- [module-isolation-rules.md](../02-packages/module-isolation-rules.md)
- [application-feature-catalog.md](../08-reference/application-feature-catalog.md)

## Change Impact

New features have zero architectural authority until registered. Do not recreate `src/modules/` or other forbidden roots.

## Invariants

1. `src/modules/` does not exist.
2. Every `src/features/*` directory is in `APPLICATION_FEATURES`.
3. Generated architecture reference docs match the registries.
4. Existing package sealing, gateways, and capability ownership remain intact.
5. Duplicate registry names/paths, stale `permittedDependencies`, and unauthorized top-level source directories fail `architecture:check`.
6. Multi-line `import { … } from '…'` is visible to seal/door/dependency scans (same as single-line).
