# ADR-0002: Capability Consolidation Follow-Up

## Status

Accepted (2026-08)

## Context

Post ADR-0001 audit found remaining dispersion: data-health policy in application paths, backup orchestration split across app and data-core, release console mechanics outside release-core.

## Decision

| Dispersion | New owner | Doors |
|---|---|---|
| Data-health types, cleanup policy, registries | `@asol/data-health-core` | `.`, `./server` |
| Backup manifest, archive, R2 traversal | `@asol/backup-core` | `.`, `./server` |
| Release command catalog, job state, artifacts | `@asol/release-core` | `./console`, `./console-server`, `./console-artifacts` |

Application **wiring seams** remain in `src/modules/` (single module per join):

- `data-health/.../execution-context.server.ts`
- `dev-cloud-backup/.../dev-cloud-backup-service.server.ts`
- `release-commands/.../build-job-runner.server.ts`

`data-core` application-edge budget reduced from 30 to 25 pinned sites.

## Consequences

- Positive: Policy and mechanics sealed; Turso stays only in data-core via ports
- Negative: More packages to maintain; agents must use ports for DB from backup-core
- `test:data-health-core` and `test:backup-core` run via `test:data-core` aggregate

## Source Map

- Packages: `packages/data-health-core/`, `backup-core/`, extended `release-core/`

## Related Documents

- [ADR-0001](./ADR-0001-consolidation-2026-08.md)
- [Capability Map](../08-reference/capability-map.md)

## Change Impact

New cross-cutting policy features should land in sealed owner, not new `src/modules/*` domain copies.

## Invariants

Database drivers remain exclusively in `@asol/data-core`.
