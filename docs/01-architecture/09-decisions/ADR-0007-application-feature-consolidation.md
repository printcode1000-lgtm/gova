# ADR-0007: Application Feature Consolidation under `src/features`

## Status

Accepted (2026-08), strengthened 2026-08-24

## Context

Application code was split across competing roots: `src/modules/`, `src/features/`, and global buckets (`src/components/`, `src/hooks/`, `src/lib/`, `src/theme/`, `src/locales/`). Architecture metadata for packages lived in `CAPABILITY_PACKAGES`, but application features had no registry, sealed doors, or generated reference documentation.

## Decision

1. **Single application feature root.** Every feature lives under `src/features/*`. `src/modules/` is forbidden and fails `architecture:check` if recreated.
2. **Approved `src/` roots only:** `app/`, `core/`, `features/`, `shared/`. Framework root files such as `instrumentation.ts` and `proxy.ts` may remain. Competing global buckets are forbidden.
3. **`src/shared/`** holds only cross-feature, domain-neutral application code.
4. **Canonical feature vocabulary.** Feature internals use the documented architectural layers; competing top-level aliases are default-deny.
5. **`APPLICATION_FEATURES` registry** in `@asol/architecture-core` is the machine-readable source of truth for every feature, its doors, runtimes, capability owners, and permitted feature dependencies.
6. **Sealed Feature Public APIs.** Cross-feature imports may use only declared `@/features/<name>`, `@/features/<name>/ui`, or `@/features/<name>/server` doors. Feature-to-feature deep imports and relative cross-feature traversal have **no exceptions**. A feature dependency also requires an explicit `permittedDependencies` edge.
7. **Composition-only exact seams.** Isolated composition/service-mirror packages may use exact `COMPOSITION_FEATURE_SEAMS` entries when a broad feature barrel would widen the deployment graph. This authority is unavailable to ordinary application features; entries must be exact, existing, used, and default-deny.
8. **Generated reference docs.** Architecture reference Markdown is generated from canonical registries and verified for drift by `architecture:check`.

## Consequences

- Positive: one application shape; default-deny feature ownership; real Public APIs at the feature boundary; no feature-internal escape hatch; no silent documentation drift; isolated service mirrors retain narrow dependency graphs.
- Negative: adding or changing a legitimate cross-feature dependency requires updating the target Public API and the importer's `permittedDependencies` declaration.
- Supersedes ADR-0002's claim that wiring seams live under `src/modules/` and supersedes the earlier ADR-0007 allowance for feature-to-feature deep-import seams.

## Source Map

- Feature registry: `packages/architecture-core/src/registry/application-features-registry.ts`
- Exact composition seams: `packages/architecture-core/src/registry/composition-feature-seams-registry.ts`
- Checks: `application-features-contract.ts`, `feature-door-contract.ts`, `feature-dependency-contract.ts`, `architecture-docs-drift-contract.ts`
- Docs generators: `packages/architecture-core/src/docs/generate-architecture-docs.ts`, `packages/architecture-core/src/docs/generate-feature-seams-doc.ts`
- Attack tests: `scripts/architecture/application-features-attack.test.ts` plus `packages/architecture-core/src/tests/index.test.ts`

## Invariants

1. `src/modules/` does not exist.
2. Every `src/features/*` directory is registered in `APPLICATION_FEATURES`.
3. Cross-feature imports use declared Public API doors only; feature-to-feature deep imports never receive exception authority.
4. Every real feature dependency is declared and every declaration is used.
5. Generated architecture reference docs match their canonical registries.
6. Package sealing, mandatory gateways, runtime isolation, composition boundaries, and capability ownership remain intact.
7. Composition-package application imports are either declared feature doors or exact `COMPOSITION_FEATURE_SEAMS`; relative deep traversal never receives seam authority.
8. Static, dynamic, type-only, barrel, and re-export import forms remain visible to architecture enforcement.
