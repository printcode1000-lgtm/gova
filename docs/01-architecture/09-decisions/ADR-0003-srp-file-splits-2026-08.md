# ADR-0003: SRP File Splits (2026-08)

## Status

Accepted (2026-08)

## Context

Large application files mixed rendering, state, pure modelling, and test harness setup — violating rule 8 without requiring new sealed packages.

## Decision

Split application-side files **organizationally** without changing public behaviour or creating new `@asol/*` packages:

- UI components keep rendering; pure logic moves to adjacent `*-model.ts`, `*.types.ts`
- Provider contexts split from provider bodies
- Integration tests keep scenarios; fixtures move to helper files
- Follow-up UI pass split cart, product page, profile, order, and map helpers similarly

No export doors, route URLs, storage keys, or notification contracts changed.

## Consequences

- Positive: Single responsibility per file; easier agent navigation
- Negative: More files to discover — naming convention `*-model.ts` is the signal
- Verification pipeline explicitly lists `test:backup-core` and `test:data-health-core` in build (not only nested via `test:data-core`)

## Source Map

- Backup: `docs/01-architecture-backup/srp-file-splits-2026-08.md`

## Related Documents

- [Single Responsibility](../01-principles/single-responsibility.md)
- [Module Isolation Rules](../02-packages/module-isolation-rules.md) rule 8

## Change Impact

New large feature files should split by responsibility in same PR, not deferred.

## Invariants

SRP splits MUST NOT bypass sealed package boundaries — extract to package only when capability ownership warrants it (see ADR-0004).
