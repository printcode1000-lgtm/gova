# Capability consolidation follow-up — 2026-08

This is the repository-wide follow-up to
[`consolidation-2026-08.md`](./consolidation-2026-08.md). The audit covered `src/`, `packages/`,
`scripts/`, the service source trees, package export maps, architecture budgets, duplicated file
content, direct vendor imports, and every explicit `src/modules/*` boundary. Generated service
mirrors were treated as outputs, not independent owners.

## Consolidated cases

| Current dispersion | Owner after the change | Why this boundary |
| :-- | :-- | :-- |
| Data-health types, cleanup policy, runtime decision and image-source registry lived under `src/modules/data-health/domain`, while `@asol/data-core` imported all four application paths. | `@asol/data-health-core` | The policy and vocabulary are one capability used by the admin UI and the database adapter. `.` is browser-safe; `./server` owns hashing and cleanup policy. Runtime selection takes an explicit boolean, so the package imports no application configuration. |
| Backup manifest types lived in the application, archive/ZIP logic lived in an application service, R2 traversal lived in another application repository, and the Turso adapter in `data-core` imported the application contract. | `@asol/backup-core` | Archive format, validation, filesystem lifecycle and full-bucket R2 behavior change together. Turso remains in `data-core`, the only database-driver owner, and is supplied through one fail-closed database port from the application seam. This avoids both a type-only package and a package cycle. |
| Release command catalog, job state machine, progress parsing, artifact discovery and bundle analysis lived in `src/modules/release-commands`; scripts and the Google Play UI imported those application internals while `@asol/release-core` already owned the release pipeline. | `@asol/release-core/console`, `./console-server`, `./console-artifacts` | These are release policy and mechanics. The browser door contains catalog/types/state rules; process work and artifact analysis use separate load-time contracts so downloading an artifact does not load OTA publishing. One application seam supplies HTTP, runtime guard, npm path and public version, and the package fails closed before registration. |

## Application seams that remain

- `src/modules/data-health/domain/execution-context.server.ts` supplies the application's runtime
  fact to `data-health-core`; presentation and API orchestration remain application code.
- `src/modules/dev-cloud-backup/services/dev-cloud-backup-service.server.ts` is the single wiring
  module joining `backup-core` to the Turso adapter in `data-core` and the development guard.
- `src/modules/release-commands/services/build-job-runner.server.ts` is the single wiring module
  joining `release-core` to the HTTP client, local-console guard and public version.

## Deliberately not packaged

- React/Next presentation trees (`components`, hooks, pages, themes and localized copy) remain in
  the application. Their dependency closures are UI-specific; moving them would create packages
  that import application components and violate rule 7.
- `data-health` repositories stay in `data-core`, because it is the only database-driver owner.
  The admin service stays in the application because it composes database, storage and logging.
- The Google Play console presentation and API clients remain in the application. Google Play
  transport and credentials are local-console adapters; the reusable release policy and server
  mechanics are now sealed in `release-core`.
- The remaining 25 `data-core` application edges are feature row contracts, one build-time
  catalog edge, and designated configuration/HTTP leaves. They remain individually pinned and
  are not grounds for a generic contracts package.

## Mechanical guarantees

- `data-core`'s application-edge budget fell from 30 to 25.
- New package doors are explicit; no wildcard exports or TypeScript path wildcards were added.
- `test:data-health-core` and `test:backup-core` run through the existing `test:data-core` gate,
  which is already part of `build`, `build:static`, `test` and CI verification.
- `test:release-core` pins the three release load-time contracts, while
  `test:release-commands` exercises the configured application seam and job lifecycle.
