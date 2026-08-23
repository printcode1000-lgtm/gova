# ADR-0007: Application Feature Consolidation under `src/features`

## Status

Accepted (2026-08)

## Context

Application code was split across competing roots: `src/modules/` (four ops surfaces), `src/features/` (product features), and global buckets (`src/components/`, `src/hooks/`, `src/lib/`, `src/theme/`, `src/locales/`). Architecture metadata for packages lived in `CAPABILITY_PACKAGES`, but application features had no registry, no sealed doors, and no generated reference docs — inventories drifted by hand.

## Decision

1. **Single application feature root.** Every former `src/modules/*` surface moves to `src/features/*`. `src/modules/` is forbidden and fails `architecture:check` if recreated.
2. **Approved `src/` roots only:** `app/`, `core/`, `features/`, `shared/`. Framework root files (`instrumentation.ts`, `proxy.ts`) remain. Competing buckets are removed.
3. **`src/shared/`** holds only cross-feature, domain-neutral code (UI primitives, layouts, brand, i18n, theme, preferences, app-init, installation).
4. **Canonical feature vocabulary.** Prefer `domain/`, `application/`, `infrastructure/`, `presentation/`, `ports/`, `server/`, `tests/`. Top-level feature directories are default-deny against the machine-readable vocabulary; competing `entities/`, `components/`, and `modules/` roots are rejected explicitly.
5. **`APPLICATION_FEATURES` registry** in `@asol/architecture-core` is the machine-readable source of truth for every `src/features/*` directory (doors, runtime targets, capability owners, permitted dependencies, and declared deep-seam target relationships).
6. **Sealed feature doors.** Cross-feature imports use `@/features/<name>`, `/ui`, or `/server` by default. A target listed in `deepImportSeams` grants no path authority by itself: any unavoidable deep feature import must also match an exact source module in `FEATURE_DEEP_IMPORT_SEAMS`. Exact entries are checked for existence and active use; stale entries fail. Isolated composition packages follow the same default-deny principle through exact `COMPOSITION_FEATURE_SEAMS`, because a broad feature barrel can widen a service mirror's capability/dependency graph.
7. **Generated reference docs.** `capability-map.md`, `package-catalog.md`, `dependency-map.md`, `application-feature-catalog.md`, and `feature-seams.md` are generated from registries and verified by `architecture:check` drift detection (`npm run architecture:docs` regenerates).

## Consequences

- Positive: one application shape; default-deny features; exact rather than target-wide deep-import authority; no silent doc drift; same sealing idea as package `exports`; isolated service mirrors keep narrow graphs.
- Negative: door files and the feature/seam registries must be updated when adding a feature or a justified cross-feature edge.
- Supersedes ADR-0002's claim that wiring seams live under `src/modules/`.

## Source Map

- Feature registry: `packages/architecture-core/src/registry/application-features-registry.ts`
- Exact feature seams: `packages/architecture-core/src/registry/feature-deep-import-seams-registry.ts`
- Exact composition seams: `packages/architecture-core/src/registry/composition-feature-seams-registry.ts`
- Checks: `application-features-contract.ts`, `feature-door-contract.ts`, `architecture-docs-drift-contract.ts`
- Docs generators: `packages/architecture-core/src/docs/generate-architecture-docs.ts`, `packages/architecture-core/src/docs/generate-feature-seams-doc.ts`
- Attack tests: `scripts/architecture/application-features-attack.test.ts` plus `packages/architecture-core/src/tests/index.test.ts`

## Related Documents

- [ADR-0002](./ADR-0002-capability-consolidation-follow-up.md)
- [ADR-0005](./ADR-0005-sealed-package-model.md)
- [module-isolation-rules.md](../02-packages/module-isolation-rules.md)
- [application-feature-catalog.md](../08-reference/application-feature-catalog.md)
- [feature-seams.md](../08-reference/feature-seams.md)

## Change Impact

New features have zero architectural authority until registered. Do not recreate `src/modules/` or other forbidden roots. A new deep import has zero authority until its relationship and exact path are both registered, and a stale seam loses authority by failing the architecture gate.

## Invariants

1. `src/modules/` does not exist.
2. Every `src/features/*` directory is in `APPLICATION_FEATURES`.
3. Generated architecture reference docs match the registries.
4. Existing package sealing, gateways, and capability ownership remain intact.
5. Duplicate registry names/paths, stale `permittedDependencies`, stale/unused exact seams, and unauthorized top-level source directories fail `architecture:check`.
6. Multi-line `import { … } from '…'` is visible to seal/door/dependency scans (same as single-line).
7. Composition-package application imports are either declared feature doors or exact `COMPOSITION_FEATURE_SEAMS`; relative deep traversal never receives seam authority.
