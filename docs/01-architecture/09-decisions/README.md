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

Full narrative backups: `docs/01-architecture-backup/`. ADRs here are agent-first summaries; backup retains migration detail.

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
