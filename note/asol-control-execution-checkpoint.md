# ASOL Control execution checkpoint

- State: dirty worktree on `3207aced9f766911c640abfa176cf964d55e2856`; no production mutation.
- Completed: route ownership registry + AST inventory; control declaration; control service/composition skeleton; control env door; OTA-admin seam; Super Admin exact seam substitutions.
- Failing command: `npx tsx scripts/sync-control-service-sources.ts`.
- Failure: `CONTROL_DECLARATION.mirrorEntryPoints` still reaches existing canonical control routes whose transitive graph includes native/push/global configuration.
- Next: replace `CONTROL_DECLARATION.mirrorEntryPoints` canonical gova routes with mirrored control route entry points, then extract only the required route services one family at a time; begin `production-deploy-service.server` closure.
- Remaining: complete control route migration and graph; all workload mirrors; gova deployment-tree isolation and compatibility redirect; per-runtime env manifests; release readiness/rollback; docs/generators; full verification; live cutover.

## Completed stages

1. Reconciled the live API source tree and generated an AST route+method inventory.
2. Added the pure owner registry and removed the client bridge's local gova fallback.
3. Added public control origin plumbing and the control account declaration.
4. Added control service/composition skeletons and a control sync entry point.
5. Extracted the production-deploy configuration door and narrowed OTA-admin and Super Admin route seams.
6. Began direct server-seam replacements for control-owned System Logs and Super Admin routes; mirror closure remains intentionally failing until their runtime adapters are extracted.
7. Replaced broad Super Admin and System Logs imports in canonical control-owned routes with the new exact server seam paths; `npm run typecheck` and `npm run api:inventory` passed before the control mirror retry.
8. Replaced the System Logs global composition registration with `control-persistence.server.ts`, a control-only adapter using explicit data/auth ports; `npm run typecheck` passes.
9. Replaced production-deploy service imports of broad auth/notifications doors with its exact super-admin identity and notification-grant seams; `npm run typecheck` passes.
10. Added the control-owned production-deploy route module and changed the control mirror entry points to the extracted deployment service/configuration closure; `npm run typecheck` passes.
11. Removed the broad Auth server bootstrap from Super Admin authorization and registered only the session-signing/super-admin identity ports required for control; `npm run typecheck` passes.
12. Added the narrow `@asol/notifications-core/grants` door and moved grant collection onto it, removing notification delivery providers from the control closure; `npm run test:notifications-core` and `npm run typecheck` pass.
13. Replaced the control deployment route's gova-wide request/trace and Super Admin seams with isolated control route/auth seams; added exact auth-core `session` and `super-admin` doors; moved unattended notification delivery to the explicit `ASOL_NOTIFICATIONS_URL` operational endpoint. Files: `services/control/src/control/super-admin-route.ts`, `services/control/src/app/api/super-admin/production-deploy/route.ts`, `src/features/release-commands/server/services/production-deploy-{service,notification-delivery}.server.ts`, `src/core/config/control-env.ts`, `packages/auth-core/{package.json,src/session.ts,src/super-admin.ts}`, `services/control/package.json`. Verification: `npm run typecheck`, `npm run api:inventory`, `npm run test:notifications-core`, `npm run test:auth-core`, and `npx tsx scripts/sync-control-service-sources.ts` pass; mirror closure is 37 shared modules with no native/browser/data/storage/push graph.
14. Added isolated control callback and GitHub OIDC production-deploy entry points, including their own operational response seam. Files: `services/control/src/control/operational-route.ts`, `services/control/src/app/api/super-admin/production-deploy/{callback,github}/route.ts`, `services/control/package.json`. Verification: `npm run typecheck` and `npx tsx scripts/sync-control-service-sources.ts` pass; mirror closure is 38 shared modules.
15. Mirrored the full System Logs route family (query, delete, ingest, authenticated SSE stream, summary) into control. Replaced the application-wide data registry with the exact profile-shard adapter door `@asol/data-core/control-system-logs`; no unrelated data source is reachable. Files: `services/control/src/{control/system-logs.ts,app/api/system-logs/**}`, `packages/data-core/{package.json,src/control-system-logs.ts}`, `src/features/system-logs/server/control-persistence.server.ts`, `services/control/package.json`. Verification: `npm run typecheck`, `npm run test:system-logs-core`, and `npx tsx scripts/sync-control-service-sources.ts` pass; mirror closure is 69 shared modules and contains only System Logs persistence plus its exact SQLite/Turso adapter.
16. Mirrored OTA administration and split its persistence from the global data registry. `@asol/ota-core/admin` is server-only and receives a registered repository; control receives `@asol/data-core/control-ota` (primary Turso only), while gova retains a separate `ota-runtime` binding. Files: `services/control/src/{control/ota-admin.ts,app/api/ota/admin/**}`, `packages/ota-core/{package.json,src/admin.ts,src/ports/index.ts,src/runtime/release-service.server.ts}`, `packages/data-core/{package.json,src/control-ota.ts,src/ota-runtime.ts,src/domains/ota/repositories/ota-release-repository.ts}`, `src/features/ota/{server.ts,server/admin.ts}`, `services/control/package.json`. Verification: `npm run typecheck`, `npm run test:auth-core`, `npm run test:system-logs-core`, and `npx tsx scripts/sync-control-service-sources.ts` pass; control mirror is 87 shared modules without native/browser/push roots.
17. Began Super Admin build-job migration with the list/start control route and an isolated release-console configuration. Split `@asol/ota-core/release-console` from the publishing barrel so build jobs reach only credential/readiness truth, not native OTA publishing code. Files: `services/control/src/{control/build-jobs.ts,app/api/super-admin/build-jobs/route.ts}`, `packages/ota-core/{package.json,src/release-console.ts}`, `packages/release-core/src/console-server/build-job-runner.ts`, `src/features/google-play-console/domain/development-guard.server.ts`, `services/control/package.json`. Verification: `npm run typecheck`, `npm run test:release-core`, and `npx tsx scripts/sync-control-service-sources.ts` pass; control mirror is 117 modules and native/browser dependencies remain excluded.
18. Mirrored build-job cancellation, logs, artifact listing, and authenticated binary artifact downloads to control. Files: `services/control/src/{control/build-jobs.ts,app/api/super-admin/build-jobs/[jobId]/{cancel,log,artifacts}/**}`. Verification: `npm run typecheck` and `npx tsx scripts/sync-control-service-sources.ts` pass; mirror is 119 modules.
19. Mirrored build-job artifact analysis, cached-analysis list/comparison, and command catalog routes to control. Files: `services/control/src/{control/build-jobs.ts,app/api/super-admin/build-jobs/{analysis/**,catalog}/route.ts,app/api/super-admin/build-jobs/[jobId]/artifacts/[name]/analysis/route.ts}`. Verification: `npm run typecheck` and `npx tsx scripts/sync-control-service-sources.ts` pass; mirror remains 119 modules.

## Current operation

- Failing command: none for the narrowed production-deploy control mirror.
- Exact next operation: extract the Super Admin data-health service from its broad feature/server barrel and mirror its first route (`GET /api/super-admin/data-health`) into control; rerun sync and cut the first widening edge.
- Remaining: mirror every other control-owned route family (Super Admin build/data/artifact/backup/store assets, OTA admin, System Logs); remove those implementation routes from gova; isolate gova artifact/compatibility boundary; finish six workload mirrors, manifests, release barrier, rollback, docs, and complete verification.

## Mirror evidence after stage 10

- `npx tsx scripts/sync-control-service-sources.ts` succeeds after the route/auth/request seam extraction. The remaining npm dependencies are only capability-justified: `@vercel/sandbox`, `nodemailer`, and phone normalization for Super Admin identity verification.

## Current failure

- No current control mirror failure after OTA extraction.

## Current failure

- In progress: `services/control/src/control/data-health.ts` and `GET /api/super-admin/data-health` now mirror the first data-health route. `npm run typecheck` passes.
- Completed stage 20: moved the data-health scan route into control. Its scan includes an intentional storage-inventory audit, so its exact S3 presigner/client and validation dependencies are declared in the control manifest rather than inherited from gova. Files: `services/control/src/{control/data-health.ts,app/api/super-admin/data-health/route.ts}`, `services/control/package.json`. Verification: `npm run typecheck`, `npm run test:data-health`, and `npx tsx scripts/sync-control-service-sources.ts` pass; control mirror is 209 modules.
- Failing command: none.
- Exact next operation: mirror the remaining data-health routes one route capability at a time, beginning with plan/cleanup; split any new dependency that is not data-health, exact storage, or the explicit System Logs audit capability.

## Completed stage 21

- Mirrored `POST /api/super-admin/data-health/plan` and `POST /api/super-admin/data-health/cleanup` with authenticated control route wrappers. Files: `services/control/src/app/api/super-admin/data-health/{plan,cleanup}/route.ts`.
- Verification: `npm run typecheck`, `npm run api:inventory`, and `npx tsx scripts/sync-control-service-sources.ts` pass; mirror remains 209 shared modules.
- Exact next operation: mirror the data-health history, schema, and quarantine routes, then the order-purge routes.

## Completed stage 22

- Mirrored data-health history, schema comparison, history clearing, and quarantine release/delete/clear routes. Files: `services/control/src/app/api/super-admin/data-health/{history/**,schema,quarantine/**}/route.ts`.
- Verification: `npm run typecheck` and `npx tsx scripts/sync-control-service-sources.ts` pass; mirror remains 209 shared modules.
- Exact next operation: mirror data-health order purge plan/purge/retry-images routes and then audit the dev-cloud-backup family.

## Completed stage 23

- Mirrored data-health order purge plan, execution, and pending-image retry routes. Files: `services/control/src/{control/data-health.ts,app/api/super-admin/data-health/orders/{plan,purge,retry-images}/route.ts}`.
- Verification: `npm run typecheck` and `npx tsx scripts/sync-control-service-sources.ts` pass; mirror is 210 shared modules.
- Exact next operation: audit and mirror the dev-cloud-backup routes, preserving authenticated binary download behavior.

## Completed stage 24

- Mirrored dev-cloud-backup list, creation, and authenticated ZIP download routes. The ZIP implementation has its own exact `fflate` dependency in control. Files: `services/control/src/{control/dev-cloud-backup.ts,app/api/super-admin/dev-cloud-backup/**}`, `services/control/package.json`.
- Verification: `npm run typecheck`, `npm run test:dev-cloud-backup`, and `npx tsx scripts/sync-control-service-sources.ts` pass; mirror is 220 shared modules.
- Exact next operation: mirror the remaining dev-cloud-backup compare/inspect/update/delete/restore routes, then start Google Play Console administrative routes.

## Completed stage 25

- Mirrored the remaining dev-cloud-backup routes: compare-saved, delete, inspect-saved, update-saved, restore-saved. Each uses the control JSON super-admin wrapper and narrows its body inline, so no gova barrel type or response door enters the control graph. Files: `services/control/src/app/api/super-admin/dev-cloud-backup/backups/{compare-saved,delete,inspect-saved,update-saved,restore-saved}/route.ts`.
- Verification: `npm run typecheck` and `npx tsx scripts/sync-control-service-sources.ts` pass; mirror remains 220 shared modules.
- Exact next operation: audit and mirror the Google Play Console administrative routes owned by control.

## Completed stage 26

- Mirrored the Google Play administration family: `GET /api/super-admin/google-play-console` plus the full `google-play-store-assets` tree (snapshot/update, backups list/restore, fastlane, image upload/delete, listing delete, mapping upload, track update/promote). Added the exact control seam `services/control/src/control/google-play.ts` so no gova feature barrel enters the graph.
- Cut the widening edge: `google-play-credentials.server.ts` imported `@asol/ota-core/publishing`, whose native gate pulled the whole Capacitor adapter tree into the control mirror. `resolveGooglePlayCredentials`, `createGooglePlayAuthClient`, and `GooglePlayCredentialStatus` are now exported from the already-narrow `@asol/ota-core/release-console` door (same adapter module, zero new modules), and the credentials seam imports that door.
- Files: `services/control/src/{control/google-play.ts,app/api/super-admin/google-play-console/route.ts,app/api/super-admin/google-play-store-assets/**}`, `packages/ota-core/src/release-console.ts`, `src/features/google-play-console/server/services/google-play-credentials.server.ts`.
- Verification: `npm run typecheck`, `npm run test:release-core`, `npm run test:ota-core`, and `npx tsx scripts/sync-control-service-sources.ts` pass; mirror is 228 modules with no Capacitor/native root.

## Completed stage 27

- Mirrored the last control-owned Super Admin routes: `POST /api/super-admin/impersonate`, `POST /api/super-admin/users/delete`, `GET /api/super-admin/users/search`, behind the new exact seam `services/control/src/control/super-admin-users.ts`.
- Split the account-deletion composition out of the broad Auth bootstrap into `src/features/auth/server/services/account-deletion.bootstrap.server.ts` (single responsibility), so control reaches account deletion without `auth-core-ports.server`, the auth user repository, or the profile store-details commands. The Super Admin user service now imports that exact seam and the exact persistent system-log service instead of two feature barrels.
- Files: `services/control/src/{control/super-admin-users.ts,app/api/super-admin/{impersonate,users/delete,users/search}/route.ts}`, `src/features/auth/server/{auth-core-bootstrap.server.ts,services/account-deletion.bootstrap.server.ts}`, `src/features/auth/server.ts`, `src/features/super-admin/server/services/super-admin-user-service.server.ts`.
- Verification: `npm run typecheck` and `npx tsx scripts/sync-control-service-sources.ts` pass; mirror is 327 modules.

## Control route parity reached

- Every canonical control-owned route under `/api/super-admin/**`, `/api/system-logs/**`, and `/api/ota/admin/**` now exists in `services/control` with identical path and identical exported HTTP methods: 53 route modules on both sides, zero missing and zero extra.
- Open blocker: `npm run architecture:check` fails on `services/control/package-lock.json is required by the compatibility reference` (`scripts/runtime-compatibility-reference.ts:164`). The control manifest is now stable, so the lockfile can be generated.
- Exact next operation: generate `services/control/package-lock.json` from the stable control manifest and re-run `npm run architecture:check`.

## Completed stage 28 — repository contracts restored

`npm run architecture:check` had been failing since the earlier stages; every violation it had accumulated is now closed and the check reports **100%**, with `npm run docs:ci` passing.

- **Control service manifest and lockfile.** Pinned every `services/control` dependency to the exact version the audited root tree resolves (`@vercel/sandbox` 2.4.0, `jose` 5.9.6, `better-sqlite3` 13.0.3, `@libsql/client` 0.17.4, `@aws-sdk/*` 3.1117.0, `nodemailer` 9.0.5, `zod` 4.4.3 — the manifest had drifted to newer majors that the mirrored source was never audited against), regenerated `services/control/package-lock.json`, verified zero direct-dependency drift against the root lock, then recorded the reviewed baseline with `npx tsx scripts/runtime-compatibility-reference.ts --write --confirm-reviewed-compatible-tree`. Files: `services/control/{package.json,package-lock.json}`, `config/runtime-compatibility-reference.json`.
- **Account-bridge routes door.** The ownership registry door is now a declared door rather than a deep import: `ACCOUNT_BRIDGE_DOORS` replaces the single-name comparison in `packages/architecture-core/src/checks/account-bridge-contract.ts`, documenting why the pure route+method registry is readable everywhere.
- **Configuration layer.** Moved every control `process.env` read into `src/core/config/server-env/`: `server-env.values.system-logs.ts` (retention/alert thresholds, with positive-number validation) and `server-env.values.control-operations.ts` (`ASOL_NOTIFICATIONS_URL`). `control-env.ts` re-exports them and reads no environment itself.
- **Operational notification exception.** `production-deploy-notification-delivery.server.ts` is now the third and only new entry in `ALLOWED_FETCH_FILES`, allowlisted by exact file with the plan's justification, so the unattended terminal deployment notification keeps working without a generic sibling-ASOL HTTP helper.
- **Notification seams moved into the package.** `notification-grant-envelope.ts` and `notification-grant-collector.server.ts` were pure and are now `@asol/notifications-core/grant-envelope` and `@asol/notifications-core/grant-collector`. Release control reaches them through package doors instead of deep feature imports, and `release-commands` no longer declares a `notifications` feature dependency.
- **Single super-admin identity.** `SUPER_ADMIN_UID`/`SUPER_ADMIN_PHONE` now live in `@asol/auth-core` (`domain/super-admin.ts`). The auth feature re-exports them, and the super-admin auth service, both control seams, and the production-deploy service all read the one source instead of three hardcoded copies.
- **Feature doors.** Removed the redundant `src/features/super-admin/server/auth.ts` sub-barrel (it re-exported exactly what the door does) and pointed all 47 importers at `@/features/super-admin/server`. Routed the gova system-logs, release-commands, and OTA-admin routes through their feature doors, exporting `registerControlSystemLogPersistence` and `registerOtaAdminServerPorts` from the system-logs and OTA doors. Declared the justified `ota` → `super-admin` edge in the features registry.
- **Capability registry.** Registered `packages/control-composition` as `@asol/control-composition`, layer `composition`, `mayImportApp: true`.
- Verification: `npm run typecheck`, `npm run architecture:check` (100%), `npm run docs:ci`, `npm run test:release-core`, `npm run test:ota-core`, and `npx tsx scripts/sync-control-service-sources.ts` (329 modules) all pass. `npm run architecture:docs` and `npm run docs:generate` were rerun and their generated output committed to the tree.
- Exact next operation: run `npm run verify:all` to get the full current baseline, then start the gova deployment-tree isolation (business API omitted from the gova build view, minimal instrumentation root, stateless 307 compatibility redirect boundary).

## Completed stage 29 — full verification baseline

`npm run verify:all` now reports **36 passed, 1 failed, 1 omitted** (it was 31/9 before this stage). Fixes:

- **`test:data-core`** — pinned the three doors this cutover added to the declared door list with the reason each exists: `./control-ota` and `./ota-runtime` (split OTA release persistence so control reads primary Turso only and gova keeps its own binding) and `./control-system-logs`. File: `packages/data-core/src/tests/index.test.ts`.
- **`test:compositions`** — `@asol/data-core/control-system-logs` constructed its database client at module load, so merely importing the door required runtime configuration and broke the products-composition graph walk. The client is now created on first use. File: `packages/data-core/src/control-system-logs.ts`.
- **`test:composition-ports`** — the check demanded that every `configure*Core` seam be called from a composition root, which is exactly what control-owned capabilities must not do. Added an inverse rule instead of an exemption: `ROUTE_SCOPED_SEAMS` (OTA admin, control System Logs persistence) must be absent from both roots *and* registered by a route, so the capability stays reachable where it is owned and nowhere else. File: `src/core/composition/tests/ports-registry.test.ts`.
- **`lint`** — eslint was linting `services/control/generated/**`, reporting the mirror's copy of findings for files nobody can edit. Added `services/*/generated/**` to the eslint ignores and added the missing `services/control/{generated,.next,node_modules,.vercel}` entries to `.gitignore`, matching the four existing service mirrors. The mirror was never tracked by git.
- **`test:ota-compatibility` / `-delivery` / `-background` / `-hardening`** — these four `verify:all` steps named npm scripts that no longer exist (they were consolidated into `test:ota-core` before this work); every run reported four false failures. Replaced with the one script that actually runs those suites. File: `scripts/verify-all.ts`.

### Known pre-existing failure, deliberately not fixed

`test:release-commands` fails on a formatting assertion — `line.length <= 120` over `src/features/google-play-console/presentation/**/*.tsx`. It fails identically on the untouched baseline (verified by stashing this work), and roughly 80 lines across 20 unrelated release-console UI files violate it, many because the limit counts UTF-16 units and Arabic combining marks push short lines over. Two of those lines were in `DeployRunbookPage.tsx` and are fixed here, with the page copy moved into `deploy-runbook-copy.ts` where the rest of that page's Arabic strings already live. Reformatting the other 18 files is unrelated UI churn: a `prettier --print-width 118` pass was tried and rejected because it traded the line-length violations for 200-line-per-file violations in three files and still could not break the long Arabic string literals. This needs its own change.

- Exact next operation: begin gova deployment-tree isolation — omit the Business API from the gova build view, add the minimal instrumentation/composition root, and add the stateless `307` compatibility redirect boundary.

## Completed stage 30 — routing fallback removed and the gova compatibility boundary added

- **No gova fallback in `buildAsolApiUrl`.** It called `resolveServiceOrigin` and, on `null`, silently substituted the page origin — the exact substitution that would send a business call back to gova after gova stops implementing business routes. It now calls `resolveRequiredServiceOrigin`, so an unowned method or an unconfigured owner origin throws a named configuration error, and a server-rendered business request raises the same error rather than becoming a sibling-backend call. Non-business paths (`/api/health`, `/api/dev/**`, public assets) are unowned by design and still use the page origin. File: `src/core/api/asol-api-config.ts`.
- **`src/core/config/business-api-origins.ts`** — the seven public owner origins and nothing else, each read as a literal `process.env.NEXT_PUBLIC_*` member so the bundler inlines it. It exists apart from `public-env` so the boundary has exactly one thing to import instead of a barrel that also carries OTA keys, R2 URLs, and build metadata.
- **`src/middleware.ts`** — the stateless transport-compatibility boundary, matched to `/api/:path*` only. It classifies method + path through the canonical registry and answers `307` (method and body preserved, `no-store`, never `308`, so no client caches gova as an owner) to the owning deployment. Unowned business paths and unconfigured owner origins answer `502` rather than passing through, because gova has no implementation to fall back to. It reads no database, storage, notification code, or server secret, and calls no `fetch` — nothing about the request or its credentials passes through gova.
- **`src/core/api/tests/compatibility-boundary.test.ts`** — covers the control redirect, query-string preservation, per-method ownership splitting on one path (`GET /api/products` → products, `POST` → sub2main), pass-through for `/api/health` and `/api/dev/**`, `502` for a missing origin and for an unregistered business path, the matcher, and a pin on the boundary's own import list plus the absence of `fetch`/`process.env` in it. Wired into `test:api-core`, and `test:api-core` was added to `verify:all`, which had never run it.
- Allowlisted `business-api-origins.ts` and the boundary test in `ALLOWED_PROCESS_ENV_FILES` (`src/middleware.ts` was already classified as configuration).
- Verification: `npm run verify:all` → **37 passed, 1 failed, 1 omitted**; the one failure is the pre-existing `test:release-commands` formatting assertion documented in stage 29. `npm run architecture:check` 100%, `npm run lint`, `npm run typecheck`, `npm run docs:ci`, and the control mirror sync (329 modules) all pass.
- Exact next operation: the gova deployment build view — omit Business API route modules and production dev routes from the app tree Vercel compiles for gova, give gova a minimal instrumentation/composition root that registers no business ports, and add the post-build artifact gates over `.next/server/app/api` and the server trace.

## Completed stage 31 — CORS preflight at the boundary

A browser never follows a redirect on a preflight, so a `307` on `OPTIONS` means the request that would be redirected is never sent at all — old clients would have broken on the first cross-origin call. `OPTIONS` is transport behavior on each receiving origin, not a second business owner, so gova answers the preflight itself: `204` with the methods the path actually accepts and `BROWSER_REQUEST_HEADERS`. The methods come from the new pure `ownedMethodsForPath()` in the registry, so a path split across two owners (`/api/products`: reads to products, writes to sub2main) advertises both halves. No deployment accepts credentials, so answering the preflight grants nothing.

- Files: `packages/account-bridge/src/routes.ts`, `src/middleware.ts`, `src/core/api/tests/compatibility-boundary.test.ts` (preflight coverage plus the updated import pin).

## Completed stage 32 — the gova deployment build view and artifact gates

The canonical Business API handlers must stay real in the repository because the service mirrors are generated from them, so gova's isolation cannot be done by editing handlers into stubs. New package **`@asol/gova-deployment-core`**:

- **`tree.ts`** builds a deterministic view of the repository into `.tmp-gova-build/` with `src/app/api` and `src/app/dev` removed and only `src/app/api/health` copied back. Removing the API tree wholesale and copying back what gova keeps means a business route added later is omitted by default — the alternative, listing what to remove, makes every future route a silent addition to the gova artifact. `services/` is not copied: gova's build never reads another runtime's tree, and the mirrors are themselves generated output. The manifest carries no timestamp, so two runs on one commit are byte-identical. The view lives in a transient build directory (matching `.tmp-static-build`) rather than a tracked sibling, because a persistent full copy of the repository gives every repository-wide scanner a second copy of every file — which is exactly what happened on the first attempt, 163 violations from files that were already clean.
- **`artifact-gate.ts`** reads what was actually built. Both halves are needed: the view is an input and can be bypassed by building the repository root directly, while `.next` is what ships. It fails, reporting every finding at once, if any API function beyond `health` exists under `.next/server/app/api`, if any dev API survives, if a business capability package appears in an `.nft.json` server trace, or if the trace names a secret gova must not hold. It matches names only and never reads a value.
- **`scripts/build-gova-deployment-tree.ts`** generates the view; `--check` is the drift gate and deliberately does not diff a written copy. The view is deterministic, so the question worth asking is whether the *classification* still holds: it cross-checks the manifest against the canonical ownership registry, so every omitted route must have an owner that will answer it and every kept route must be one no runtime owns. A business route added without an owner fails here rather than shipping as a 404 behind the boundary. Currently **1 route kept, 121 omitted**.
- **`scripts/verify-gova-artifact.ts`** runs the post-build gate.

**Minimal gova composition root.** `src/core/config/runtime-role.ts` reads `ASOL_RUNTIME_ROLE` in the configuration layer and defaults to the full application, so a missing value cannot silently turn a business deployment into a frontend that registers nothing. `src/core/composition/gova-frontend-ports.ts` registers observability and nothing else — no data, storage, orders, system logs, OTA admin, notifications, or release port — and `src/instrumentation.ts` branches on the role. `test:composition-ports` now pins that root's import list exactly and asserts it reaches no business package, because registering one more port looks harmless in a diff and puts a database driver and its credentials into a frontend. The env var is a convenience, not the enforcement: if it is unset in gova, the full root loads and the artifact gate fails on the resulting trace.

- Registered `@asol/gova-deployment-core` in the capability registry and `tsconfig.json` paths, recorded the new workspace package in the compatibility reference, and added `.tmp-gova-build/` to `.gitignore` and the eslint ignores.
- `gova:tree:check` and `test:gova-deployment-core` added to `verify:all`.
- Verification: `npm run verify:all` → **39 passed, 1 failed, 1 omitted** (the failure is still the pre-existing `test:release-commands` formatting assertion). `architecture:check` 100%, `lint`, `typecheck`, `docs:ci`, control mirror 329 modules.
- Exact next operation: per-runtime environment manifests — replace the global hosted-env union with an account-specific guard that validates only the runtime it is checking, and generate the names-only foreign-secret report.

## Completed stage 33 — per-runtime environment ownership

The hosted guard validated gova against `HOSTED_RUNTIME_ENV_KEYS`: the union of every account's `requiredEnv`. A gova build therefore failed unless the gova project held the notification provider keys, the OTA R2 credentials, and every shard's database token — secrets a frontend has no code to use, demanded of it because some other deployment needs them. A guard that cannot say which runtime it is checking cannot enforce isolation; it can only enforce that every project holds everything.

- **gova's declaration is now a frontend's.** `GOVA_FRONTEND_REQUIRED_ENV_KEYS` is the seven owner origins its compatibility boundary redirects to, and nothing else; `GOVA_FRONTEND_OPTIONAL_ENV_KEYS` is public build metadata and the runtime role. The full-application lists stay where they are — `submain` still inherits them — but `GOVA_DECLARATION` no longer points at them. Files: `packages/account-declarations/src/accounts/{gova.ts,gova-runtime-env-keys.ts}`, `packages/account-declarations/src/index.ts`.
- **The guard takes a runtime.** `hostedRuntimeEnvKeys(runtime)`, `missingHostedRuntimeEnvKeys(runtime, env)`, and `assertVercelRuntimeEnvironment(runtime, env)` read exactly one declaration. `runtimeAccountFromEnv()` resolves `ASOL_RUNTIME_ACCOUNT`, defaults to `gova`, and throws on a name that is not a declared account. File: `scripts/vercel-deployment-guards.ts`.
- **Foreign-secret detection.** `foreignRuntimeEnvNames(runtime, env)` reports, by name only, every environment key present that the runtime does not declare and that belongs to a secret family (database, object storage, session/grant signing, push provider, mail, deployment credential, store publishing), with the accounts that do declare it. Families rather than a key list, so a new key inside a category a project already should not have cannot slip past. It never reads a value, so its output is safe to paste into an issue.
- **`scripts/runtime-env-ownership-report.ts`** (`npm run env:ownership`) prints that report and exits non-zero on a foreign *deployment* credential — the one finding that is never a false positive, because a project that can deploy another account is not isolated from it. The hosted build logs the same findings as a warning without failing, since a project may legitimately carry an unrelated key.
- `scripts/check-environment-requirements.ts` now emits one row per runtime instead of a merged row that told the reader gova was missing another deployment's database tokens.
- Tests rewritten in `scripts/tests/vercel-deployment-guards.test.ts`: gova's keys must *not* include `TURSO_DATABASE_URL`, `SYSTEM_OPS_DATABASE_URL`, `ASOL_SESSION_SIGNING_SECRET`, `WEB_PUSH_VAPID_PRIVATE_KEY`, or `R2_SECRET_ACCESS_KEY`; control's must include the session secret and must not include gova's own origin; no runtime may require a Vercel deploy token; the runtime resolver's default and rejection; and the foreign-secret report's findings plus a direct assertion that no value appears in its output.
- Verification: `npm run verify:all` → **39 passed, 1 failed, 1 omitted** (the pre-existing `test:release-commands` formatting assertion). `architecture:check` 100%, `lint`, `typecheck`, `test:deployment-tools` all pass.
- Exact next operation: the six workload service mirrors — confirm each still closes against the new doors, then the release readiness/rollback barrier and the control deploy/smoke commands.

## Completed stage 34 — the control runtime builds, starts, and answers

`services/control` had no `tsconfig.json` and no `next.config.ts`, so it had never actually been built — and the root `typecheck` does not reach `services/`, which meant its route files had never been typechecked either. Both are fixed, and building it surfaced real defects that only a build could find.

- **Buildable.** Added `services/control/{tsconfig.json,next.config.ts,next-env.d.ts}`. The tsconfig maps `@/*` to both `./src/*` (control's own route and seam files) and `./generated/src/*` (the mirror). `next.config.ts` pins the turbopack root and externalizes the Node-only packages; unlike the notifications service it does **not** stub `better-sqlite3`, because the System Logs adapter reaches the same profile-shard client the application uses and stubbing a branch this deployment can take would fail at runtime instead of at build.
- **Two eager database connections.** `@asol/data-core/control-ota` opened its Turso client in a field initializer, making `TURSO_DATABASE_URL` a requirement for *importing* the door — Next collects every route's module graph at build, so the OTA admin routes failed to build on a machine with no database configured. Now lazy, matching the same fix already made to `control-system-logs`.
- **Optional body.** `runControlSuperAdminJsonRoute` typed its context as `{ body?: TBody }`, so every JSON route's handler saw `body` as possibly undefined under the service's own strict tsconfig. The JSON variant has already parsed the body, so it now uses a `JsonContext<TBody>` with a required `body`.
- **`deploy:revision` narrowed out of the console route.** The control production-deploy route accepted the full `StartRemoteDeployAllInput`, whose `command` includes `deploy:revision`. A revision deploy targets an exact commit authenticated by the GitHub OIDC route; accepting it from a Super Admin session would let the console deploy a commit no push event vouched for.

### The error contract, shared rather than restated

Building and smoking control found the defect that mattered most: **the two runtimes answered the same failures differently.** `forbidden` was `403` in the application and `401` in control; an unrecognised error was `500 internalServerError` in the application and `400` in control. A client moved to a new origin that maps the same error to a different status is a broken client, and nothing in the suite would have noticed — both runtimes were internally consistent and disagreed with each other.

- **`src/core/api/business-api-error-status.ts`** is the pure status/skip-persistence mapping, extracted from `mapServiceError`. Control cannot call `mapServiceError` itself — it persists system logs and returns a `NextResponse` — so the mapping had been duplicated by hand. `mapServiceError` now delegates to it and keeps only what is genuinely its own: the logging decision.
- All four control seams (`super-admin-route`, `operational-route`, `ota-admin`, `system-logs`) map through it. Two documented per-family exceptions remain and are asserted: System Logs answers `401` for a missing or expired session, as the application does, because its console must tell "sign in again" from "bad query"; and the GitHub OIDC entry point reports a rejected push identity as `forbidden`/`401` so a misconfigured workflow reads as "authenticate".
- The control callback now distinguishes a malformed body: `request.json()` throws a `SyntaxError` the shared mapping would report as `500`, where the application's `readJsonBody` makes it the caller's `400 invalidJsonBody`.
- The Google Play console route's disallowed-environment payload is preserved byte for byte, including its omission of `config.credentialSource` — a required field the application never actually sent, because its response helper inferred the type from the literal. A mirror is the wrong place to change what a client receives, so the omission is typed as deliberate and commented rather than quietly filled in.
- `scripts/tests/control-service.test.ts` now asserts every control error seam goes through the shared mapping and scans for hardcoded statuses, allowing only the two documented exceptions.
- `src/core/api/tests/production-deploy-concurrency-logging.test.ts` was rewritten against the new home: statuses are asserted by calling the mapping, and the quiet-vs-loud logging contract is still read from `api-response.ts`, where logging still lives.

### Commands and the release barrier

- `control:sync`, `control:verify`, `control:build`, `control:smoke`, `control:deploy`, `test:control` — control stays outside the six-workload arrays, because it holds deployment authority over them and a loop that treats it as one of them can redeploy the runtime performing the deploy.
- **`/api/release-readiness/[revision]`** is now real, not a stub that always said `pending`. It reads the deploy snapshot and answers `pending | ready | failed` for a full 40-character SHA. A revision the runtime has no record of is `pending`, not `failed`: the pipeline may be asking before the deploy started, and `failed` would abort a release that had not begun. On any internal error it answers `pending` rather than a reason — it is the one control surface polled without a Super Admin session, so a reason would be an unauthenticated window into the runtime's configuration.
- **`scripts/smoke-control-service.ts`** builds control, starts it, and asks six questions. Health is deliberately not enough, for the reason `check-service-smoke.ts` records. **Actually run, and passing:** `200` health, `200` barrier for an unknown revision, `400` barrier for a malformed one, `400 sessionTokenInvalid` on build-jobs, `401` on System Logs, `403 forbidden` on OTA admin. Every one of those codes matches what the application answers for the same request. The smoke also asserts the barrier's response body carries no key beyond `revision` and `status`.
- Verification: `npm run verify:all` → **40 passed, 1 failed, 1 omitted** (the pre-existing `test:release-commands` formatting assertion). `npm ci` + `npx next build` in `services/control` succeed and emit 55 API functions; `npm run control:smoke` passes end to end; `architecture:check` 100%; all seven mirrors sync.
- Exact next operation: the rollback path and the `dev:distributed` local orchestration, then the documentation updates under `docs/`.

## Completed stage 35 — automatic rollback, and a fully green suite

### Rollback

`@asol/vercel-deploy-core/release-rollback` implements the compensation contract: once production mutation starts, a failure must not pause for instructions, because a half-applied topology — three workloads on the new revision, three on the old, and a frontend redirecting to both — is worse than either end state, and nobody is watching at the moment it happens.

- `captureProductionBaseline()` records what each project is serving, by deployment id, before the first mutation. A project that does not exist yet returns a baseline with no id rather than throwing: "there was nothing here before" is the normal answer for control on the release that creates it, and it is exactly what the rollback needs in order to leave it alone.
- `rollbackToBaseline()` re-promotes each project to the exact deployment it was serving. It **promotes, never redeploys** — a rebuild could fail for the same reason the release did — and it never stops at the first failure, because a rollback that aborts halfway leaves the mixed topology it exists to prevent.
- `formatRollbackReport()` is names-only and safe to print from a release log.
- `packages/vercel-deploy-core/src/tests/release-rollback.test.ts` exercises all of it against an injected `fetch`, with no secret: a path that can only be tested against live Vercel is a path nobody runs until the night it is needed. It asserts the promote endpoint is used and `/v13/deployments` is not, that the team id is carried on every call, that one failure does not stop the rest, and that no token appears in the report.

### The full suite is green

`npm run verify:all` → **41 passed, 0 failed, 1 omitted** (`ota:self-test` needs a live R2 object and the OTA signing key). `npm run test` → **all 96 generated gates pass**. Getting there fixed six tests that had been asserting the pre-cutover shape:

- **`test:release-commands`** — the formatting assertion documented as deferred in stage 29 is now actually fixed. `prettier --print-width 118` handled 17 of the 20 files. The `Deploy*` files could not be fixed that way because their long lines are Arabic string literals — the cap counts UTF-16 units, and combining marks push a sentence over 120 at well under 120 visible characters — so those strings moved to a new `deploy-runbook-labels.ts`, beside the `deploy-runbook-copy.ts` that already holds this page's other Arabic text. Two files then exceeded the 200-line cap and were split along real seams: `OtaReleaseReports.tsx` (the three read-only report sections, none of which acts on anything) and `ReleaseCommandConfirmBlockers.tsx` + `ReleaseCommandSummary.tsx` (why the confirm button is disabled, and what is about to run).
- **`test:account-bridge`** — imported `READ_ROUTES`/`SUBMAIN_ROUTES`/`SUB2MAIN_ROUTES`, the three hand-written tables the registry replaced. T4 asserted the development fallback (`web × local-development` → `null`) that the plan removes; it now asserts every platform × deployment resolves the owner, and that the same path splits by method. T6b's premise — "a platform-blind implementation must fail this suite" — no longer holds, so it was replaced with the defect that matters now: an implementation that answers with the page origin when it finds no owner. T7's `/api/orders/12345` → `null` became `→ submain`, which is what the registry actually says. T8 now asserts the three tables must *not* come back.
- **`test:service-bridge`**, **orders and profiles and products service-module contracts** — all asserted `method.toUpperCase() !== 'GET'` or a route-table name on the bridge source. Writes now have their own owners, so a hardcoded method rule would send them to the wrong one; each assertion moved to the decision (`resolveRouteOwner`) rather than to a name that no longer exists.
- **`test:notifications-core`** — its door list is deliberately pinned, so the two doors this cutover added (`./grant-envelope`, `./grant-collector`) are now declared with the reason each exists.
- **`test:import-without-composition`** — `@asol/control-composition` and `@asol/gova-deployment-core` had no `node_modules` link; `npm install` linked them, and the resulting lockfile change (two workspace links, nothing else) was reviewed into the compatibility reference.
- **`test:service-runtime-core`** — control's health route built its own response. It now uses `credentialHealthResponse`, reporting presence and never values, with the session secret and the deployment credentials as separate entries so "control is up but cannot deploy" is a visible state.

### Remaining

- `dev:distributed` local orchestration (all eight runtimes on declared local origins, with a smoke over one owned route per destination).
- The English documentation updates under `docs/`.
- The live cutover itself. It creates the `asol-control` Vercel project and mutates production across eight accounts, so it is not something to start without explicit authorization; everything it needs — build view, artifact gates, per-runtime env manifests, readiness barrier, rollback, smoke — is in place and verified.

## Completed stage 36 — local distributed development and documentation

### `dev:distributed`

`LOCAL_DEVELOPMENT_PORTS` in `@asol/account-declarations` declares one port per runtime (gova 3001, control 3002, then the six workloads through 3008). `scripts/dev-distributed.ts` starts all eight from the repository's own pinned Next binary — no `npm ci` per service — points gova's client bridge at the local origins exactly as production points it at public ones, and sets `ASOL_RUNTIME_ACCOUNT` per process so the environment guard validates each against its own declaration.

Development used to be one process with a fallback: anything the bridge could not place went to the main app, which answered it because the main app still implemented everything. That made local development the one environment where a routing mistake could not fail, which is why the routing had to be proven in production instead.

- `--smoke` asks each destination for a route it actually owns, and first checks the registry agrees the probe belongs to that account — a green smoke against a misattributed probe says nothing about the topology it claims to verify. Health is not the probe, for the reason the service smoke gates record.
- It also asserts gova's boundary still `307`s `/api/system-logs` to the control origin.
- `--only=` runs a subset. Ports are checked by **binding**, not by an HTTP probe: the first version treated a failed request as "free", missed a dev server bound to `::` while probing `127.0.0.1`, and died on `EADDRINUSE` seconds later with a message about the wrong thing. A busy port is reported, never worked around — starting on a different port would hand the bridge origins that do not match the topology.

**Actually exercised:** `--only=control --smoke` passes end to end (control boots, `/api/super-admin/build-jobs` answers `400`). The gova half could not be run here because port 3001 is held by an existing dev server that is not mine to stop; probing that running server confirms the boundary is live in a real Next process — `/api/system-logs` answers `502 businessApiOwnerOriginNotConfigured`, which is the boundary resolving control as the owner and finding no origin configured in that process. The redirect itself is covered deterministically by `src/core/api/tests/compatibility-boundary.test.ts`.

### Documentation

- **`docs/06-super-admin-and-operations/control-runtime.md`** (new): why control is separate, what it owns and where that ownership is declared, the readiness barrier and why an unknown revision is `pending`, the shared error contract and its two documented exceptions, the commands, rollback, and the names-only environment report.
- **`cloud-accounts-architecture.md`**: Vercel is now eight accounts. `gova` is described as a frontend plus compatibility boundary rather than "full app minus bridge-routed APIs", `asol-control` is added, and the reason control is not one of the six workloads is stated where the six are listed.
- **`docs/06-super-admin-and-operations/README.md`**: points at the new document from both the purpose and the task index.
- Generated catalogs, graphs, and reports regenerated. `npm run docs:ci` passes.

### Final state

`npm run verify:all` → **41 passed, 0 failed, 1 omitted**. `npm run test` → all 96 gates. `npm run architecture:check` → 100%. `npm run docs:ci` → passes. All seven service mirrors sync. `services/control` installs, builds (55 API functions), starts, and passes its smoke.

### Not done

**The live cutover.** It creates the `asol-control` Vercel project and mutates production across eight accounts, and it is the one step in the plan that is not reversible from inside the repository. Everything it depends on is in place and verified — build view, artifact gates, per-runtime environment manifests, readiness barrier, rollback with a tested compensation path, and smoke for control and for the local topology — but starting it needs explicit authorization, and the credentials for the eight accounts are not present in this environment.

## Stage 37 — LIVE PRE-CUTOVER PREFLIGHT: result

Run against the real Vercel API with the eight account tokens from `.env.local`/`.env`. Every check was read-only. **No production was mutated. No secret value was printed.**

### What passed

1. **CLI and auth.** Pinned `vercel@59.0.0` present. There is no interactive CLI session (`vercel whoami` → `Not authorized`), which is expected: the deploy tooling authenticates per account with a token env var, and **all eight are present** — `VERCEL_TOKEN`, `VERCEL_CONTROL_TOKEN`, `VERCEL_SUBMAIN_TOKEN` (+`VERCEL_SUBMAIN_ORG_ID`), `VERCEL_SUB2MAIN_TOKEN` (+`VERCEL_SUB2MAIN_ORG_ID`), `VERCEL_NOTIFICATIONS_TOKEN`, `VERCEL_PRODUCTS_TOKEN`, `VERCEL_ORDERS_TOKEN`, `VERCEL_PROFILES_TOKEN`.
2. **Identities verified live.** All eight tokens resolve to a real Vercel user. Seven match their declaration exactly. **One did not:** `asol-control` was declared as owned by the gova address while `VERCEL_CONTROL_TOKEN` authenticates as `tenderxcontractors@gmail.com` — corrected in `CONTROL_DECLARATION`, because that field exists to say who can reissue the token at the moment control is down.
3. **All eight projects already exist**, including `asol-control` (`prj_Pi7FQmsTr4qlvLGyhUK3tBSwbm5y`) with OIDC enabled (`issuerMode: team`). No project needs creating.
4. **gova is the only Git-connected project** — `github:printcode1000-lgtm/gova`, production branch `main`. The other seven report `DISCONNECTED` and are CLI-managed, exactly as required.
5. **Stable production aliases exist for all eight**, including `asol-control.vercel.app` — so the alias to record in gova's `NEXT_PUBLIC_ASOL_CONTROL_URL` is already known, which is what the plan's bootstrap step 6 needs.
6. **Rollback baseline captured live** for all eight through the real `captureProductionBaseline()`. Seven have a promoted production deployment id; `control` has none, which is the "skipped" case the rollback path already handles and tests.
7. **Environment ownership.** The six workloads have **100%** of their declared required keys present on their own Vercel projects (submain 42/42, sub2main 24/24, notifications 4/4, products 2/2, orders 18/18, profiles 20/20).
8. **The deploy-plane secrets are migratable.** `ASOL_SECRET_ARCHIVE_PASSWORD`, `ASOL_DEPLOY_CALLBACK_SECRET`, `ASOL_DEPLOY_NOTIFICATION_EMAIL`, `ASOL_DEPLOY_REPOSITORY_URL`, `ASOL_DEPLOY_REPOSITORY_TOKEN`, and `ASOL_SESSION_SIGNING_SECRET` all exist encrypted on the gova project and are readable with the available token — 6/6. Control's data credentials (`TURSO_DATABASE_URL`/`TURSO_AUTH_TOKEN`, `SYSTEM_OPS_DATABASE_URL`/`SYSTEM_OPS_DATABASE_AUTH_TOKEN`) are all present locally.

**There is no EXTERNAL BLOCKER.** Every credential and every resource the cutover needs is available.

### What did not pass — all three are repository state, not external

1. **The release SHA does not exist.** `HEAD` is `3207aced`, the pre-cutover baseline; the entire implementation is 225 uncommitted files. Every step of the cutover is defined against "the exact SHA", so there is nothing yet to deploy the workloads *at*.
2. **`build:vercel` is not the gova-only pipeline the plan mandates.** It still runs `next build` over the whole repository. `asol-control` is Git-disconnected, but gova is not — the moment the final commit lands on `main`, `vercel.json`'s `ignoreCommand` lets the build proceed and gova would compile and publish all 121 Business API functions, which is precisely what the cutover removes. The plan requires the command to run, in order: host checks → exact-SHA control readiness wait → gova-only env validation → deterministic gova tree generation → Next build of that tree → artifact route/trace/secret scan → size guard. Only the first, part of the third, and the last exist today. The `@asol/gova-deployment-core` tooling and its artifact gate are built and tested but **nothing calls them from the hosted build**.
3. **The exact-SHA readiness barrier has no durable backing.** This is the finding that only a live preflight could produce. `getRemoteDeployAllResult()` reads its snapshot from *inside a live Vercel Sandbox* and returns `idle` when no sandbox exists, so control can only ever report `ready` for a SHA released through its own sandbox-driven `deploy:all`. It cannot report `ready` for a CLI-driven bootstrap release — which is exactly what this first cutover is, and what the plan's own bootstrap section prescribes. Wiring gova's build to wait on that barrier today would hang the gova build forever on this release.

Blocker 3 needs a design decision that the preflight surfaced rather than a wiring fix: control needs durable release-state of its own, written by an authenticated release endpoint and read by the barrier, so that "this SHA is ready" survives the sandbox that produced it.

### Repository corrections made during the preflight

- `CONTROL_DECLARATION.email` corrected to the verified token identity.
- `CONTROL_RUNTIME_REQUIRED_ENV_KEYS` rewritten to what control's route graph actually proves it needs (session secret, primary Turso, system-ops shard). It had listed `ASOL_REMOTE_DEPLOY_SANDBOX`, which no control code reads — the sandbox runner sets it to `1` inside its own child process — and `ASOL_DEPLOY_REPOSITORY_URL`, which belongs to the optional release plane.
- The release plane moved to `CONTROL_RUNTIME_OPTIONAL_ENV_KEYS`: control serves Super Admin, System Logs, and OTA administration without it and degrades to `productionDeployNotConfigured` rather than failing to start.
- The declaration isolation test now allows exactly one cross-account **origin**, `ASOL_NOTIFICATIONS_URL`, with the reason stated: it is the address for the single allowlisted terminal-notification hop, carries no notification database and no push provider credential, and the rule still catches a real notifications secret landing on control.
- Verification after the corrections: `typecheck`, `test:account-declarations`, `test:deployment-tools`, `docs:generate`, `architecture:check` (100%) all pass.
