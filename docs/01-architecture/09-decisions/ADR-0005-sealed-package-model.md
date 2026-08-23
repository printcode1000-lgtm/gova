# ADR-0005: Sealed Package Model

## Status

Accepted (2026-08, ongoing)

## Context

The repository requires mechanical enforcement of module boundaries beyond convention. Prior ad-hoc imports caused silent bypasses of database, storage, and native capabilities.

## Decision

Adopt the **sealed package model** with nine module isolation rules:

1. Core module holds sensitive logic
2. Declared public API (`exports` doors only)
3. Tests gate the build
4. Internal validation at boundaries
5. No deep imports (four enforcement layers)
6. Branch/release gates via npm scripts on `main`
7. Independent `packages/<name>` — compositions excepted for `@/` wiring
8. Single responsibility per file
9. Dependency-upgrade isolation within owner

Forty-one packages register in `CAPABILITY_PACKAGES` across layers: `capability`, `composition`, `declarations`, `bridge`, `enforcement`.

Enforcement engine: `@asol/architecture-core` invoked by `npm run architecture:check`.

## Consequences

- Positive: Default deny; closure verifiable; agents have canonical ownership map
- Negative: Higher upfront cost for new features; scan failures require door discipline
- No GitHub Actions — npm build chain is the CI equivalent

## Source Map

- Rules: [module-isolation-rules.md](../../01-architecture/02-packages/module-isolation-rules.md)
- Backup: `docs/01-architecture-backup/module-isolation-rules.md`
- Registry: `capability-registry.ts` (41 packages)

## Related Documents

- [Capability Map](../08-reference/capability-map.md)
- [Architecture Check](../07-enforcement/architecture-check.md)
- [ADR-0001](./ADR-0001-consolidation-2026-08.md)

## Change Impact

Weakening any rule requires ADR superseding this one and enforcement downgrade is not permitted without replacement checks.

## Invariants

Capability ownership canonical document is [capability-map.md](../08-reference/capability-map.md) — other docs link, not duplicate.
