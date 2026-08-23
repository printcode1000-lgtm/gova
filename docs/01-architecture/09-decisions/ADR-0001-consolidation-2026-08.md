# ADR-0001: August 2026 Capability Consolidation

## Status

Accepted (2026-08)

## Context

Scattered concerns across `src/` and `scripts/` duplicated algorithms, bypassed package gates, and split enforcement from contracts. Eight capabilities lacked sealed owners.

## Decision

Create eight sealed `@asol/*-core` packages in one consolidation wave:

| Package | Absorbed concern |
|---|---|
| `@asol/format-core` | Locale/money formatting (~25 divergent call sites) |
| `@asol/signed-token-core` | HMAC-SHA256 signed envelope (4 duplicate implementations) |
| `@asol/service-runtime-core` | Shared HTTP/error helpers across service mirrors |
| `@asol/architecture-core` | Architecture contracts + scan (unified from `src/` + `scripts/`) |
| `@asol/observability-core` | Developer monitor (14 unsealed files) |
| `@asol/env-core` | Environment variable reading rules |
| `@asol/release-core` | Release pipeline from `scripts/lib/` |
| `@asol/secrets-core` | Secrets archive encryption |

Each package received: explicit `exports`, registry entry, `test:*-core` in build chain.

## Consequences

- Positive: Single owners, build-gated tests, unified architecture scan
- Negative: Migration churn; agents must learn new doors
- `@asol/architecture-core` eliminated cross-tree relative imports from enforcement tooling

## Source Map

- Backup narrative: `docs/01-architecture-backup/consolidation-2026-08.md`
- Registry: all eight entries in `capability-registry.ts`

## Related Documents

- [ADR-0002](./ADR-0002-capability-consolidation-follow-up.md)
- [ADR-0005](./ADR-0005-sealed-package-model.md)
- [Package Catalog](../08-reference/package-catalog.md)

## Change Impact

Reverting any of the eight packages would re-open bypass paths closed by scan rules.

## Invariants

Architecture rules and enforcement MUST remain co-located in `@asol/architecture-core`.
