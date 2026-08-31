# ASOL Control Migration — Single-Agent Execution Plan

> **Execution model:** one agent, one serial migration, no multi-agent coordination layer.
>
> **Audited baseline:** this plan was reconciled against `main` commit `760bac3dbda47c65336c1f8bb3f4d02e85408a8f` on 2026-08-31. The repository is the source of truth. If relevant code has changed since that commit, re-run the discovery steps below and update the implementation to the current code instead of forcing this note's baseline facts.

## Mission

Complete the migration from the current mixed `gova` server/application architecture to the following production architecture without losing existing behavior:

- `gova` is the **only GitHub-linked Vercel project** and becomes production **frontend-only**: pages, client/static assets, `/.well-known/**`, and `/api/health`.
- `asol-control` becomes the **only operational control runtime** for deployment authority and administrative operations: production deployment endpoints, Vercel Sandbox orchestration, Super Admin server operations, system logs, and OTA administration.
- The existing six product/workload deployments remain isolated and are reached directly by the browser/static/native clients:
  - `notifications`
  - `products`
  - `orders`
  - `profiles`
  - `submain`
  - `sub2main`
- No application backend implements business behavior by calling another ASOL backend. The browser/native client is the cross-account bridge. The only exception is the **control deployment runner/Sandbox**, which may know deployment targets and may perform deployment/readiness/smoke verification as operational orchestration; that exception must never become a business-data backend bridge.

The migration must preserve current API behavior, status codes, response bodies, authorization rules, CORS behavior, notification-grant semantics, static/native routing, release behavior, architecture boundaries, and generated documentation unless this plan explicitly declares an intentional behavior change.

## Execution authority and safety

1. This is a **single-agent** plan. Do not create agent-specific branches, worktrees, ownership handoffs, discussion files, or cross-agent review rings.
2. Follow the repository's current rules first. Read `AGENTS.md` and the relevant documentation before editing. `main` is the repository's only normal branch; do not introduce a feature-branch/PR workflow for this migration.
3. Inspect `git status` before editing and preserve unrelated user changes. Never reset, overwrite, or clean user work.
4. Never print, commit, copy into `note/`, or expose secret values. Secret checks and reports are names-only (`present` / `missing`).
5. Do not guess live Vercel project IDs, team IDs, owner email, domains, or the future `asol-control` production URL. Verify live values through the existing Vercel tooling/API before using them.
6. Repository changes and local verification may proceed serially. **Live production deployment, destructive live Vercel environment deletion, credential rotation, and final push/cutover require explicit authorization in the execution session unless the invoking instruction explicitly grants those actions.**
7. Do not weaken current quality or architecture gates to make the migration pass. Update a gate only when the architecture contract legitimately changes, and add focused regression coverage for that change.
8. Do not hand-edit generated architecture/knowledge documentation. Update registries/sources and regenerate.
9. Do not replace real source handlers with simplified migration stubs. The current `src/app/api/**/route.ts` handlers are part of the service-mirror source graph and must remain behaviorally real.

---

## Audited current-state facts

These facts describe the audited baseline and are important because several old assumptions are no longer true.

### Accounts and declarations

The current `@asol/account-declarations` registry has exactly seven declarations:

- `gova`
- `notifications`
- `products`
- `orders`
- `profiles`
- `submain`
- `sub2main`

There is currently **no** `control` declaration, no `@asol/account-declarations/control` export, no `services/control`, and no `packages/control-composition`.

`GOVA_DECLARATION` itself is intentionally minimal, but `gova-runtime-env-keys.ts` still models a full server runtime containing database, auth, R2, push, OTA, and other server-only environment families. `submain-runtime-env-keys.ts` currently inherits the broad gova runtime lists. That broad inheritance is incompatible with the target least-privilege architecture and must be replaced with ownership derived from actual route/import dependencies.

The declaration tests currently contain architecture-count assumptions such as seven declarations and fixed env-key counts for existing services. Do not preserve those counts blindly. Change the contract deliberately and make tests prove the new architecture.

### Packages and compositions

The current architecture registry already contains more packages than some editable docs describe. Therefore **never perform a mechanical `41 -> 42` or similar count edit**. Derive package/composition counts from the current registries, add the new package, and regenerate the generated references.

There are currently six composition packages/seam entries:

- `notifications-composition`
- `orders-composition`
- `products-composition`
- `profiles-composition`
- `submain-composition`
- `sub2main-composition`

`control-composition` must be created using the same sealed-package pattern: a package manifest, one declared public door unless a second door is genuinely required, focused tests, architecture-registry registration, and only exact application seams that its runtime needs.

### Service mirrors

The current mirror tooling explicitly knows six services. `scripts/sync-all-service-sources.ts` runs six sync scripts and `scripts/verify-service-mirrors.ts` verifies six uploads.

`control` is **not a seventh product service**. It needs a control-runtime sync/verify/build path that can be included in aggregate verification without adding it to product-service loops or semantics. If shared tooling is generalized, model runtime kind explicitly instead of pretending control is a product service.

### Browser bridge

The current generic `@asol/account-bridge` routing surface is partial:

- generic `ServiceKey` currently covers `products`, `orders`, `profiles`, `submain`, and `sub2main`;
- the generic HTTP method union currently omits `PATCH`;
- only a limited set of current product/profile/order/search/write routes is mapped;
- unresolved routes return `null`.

Notifications are intentionally handled by a **separate notification-grant bridge** (`@asol/account-bridge/notifications`) that delivers signed grants from browser/native code to `/api/notifications/send` with `credentials: 'omit'`. Preserve this separate channel unless a deliberate, fully tested refactor proves a better equivalent. Do not casually fold notification grant delivery into the generic route table.

### Current API fallback

`buildAsolApiUrl()` currently resolves a mapped service origin and otherwise falls back to the main API base / page origin. `public-env.ts` still accepts legacy generic API base variables, including a server-side `ASOL_API_BASE_URL` fallback in client-safe configuration.

This fallback must **not** survive for production/static/native business API routing. Development may keep an explicitly tested local same-origin fallback. Production, static export, Android, and iOS must fail clearly when a required destination origin is missing instead of sending the request to `gova`.

### Current gova proxy

`src/proxy.ts` currently applies API CORS and returns `204` for `OPTIONS`, but it does not shut down business APIs on gova production.

The target shutdown must be centralized at the gova production boundary. Do not turn source route files into `410` handlers because the service mirror needs their real implementations.

### Current deployment flow

The current GitHub production workflow sends its OIDC-authenticated production-deploy request to the `gova` production endpoint. The release pipeline has phases:

`preflight -> publish -> notifications -> products -> orders -> profiles -> submain -> sub2main -> main`

`SERVICE_PHASE_IDS` contains exactly the six workload deployments. Preserve that distinction: `control` must not enter `SERVICE_PHASE_IDS`.

`deploy:all` / `deploy:push` currently deploy selected isolated services and verify the GitHub-linked main project. After migration they must operate under control authority while continuing to treat `gova` as GitHub-built and verification-only; they must never create a second CLI production deployment of `gova` for the same revision.

### Current production-deploy notification backend hop

The current terminal deployment callback can create notification grants and then perform a server-side HTTP call to the notifications deployment. That is a real backend-to-backend application call and conflicts with the target isolation rule.

This migration intentionally removes that server delivery hop. Preserve durable deployment status/logging and deployment email. When a Super Admin browser polls a terminal deployment, signed notification grants may still be attached and delivered through the existing browser notification bridge. A GitHub-triggered deployment that finishes while no browser is open is **not allowed to regain immediate in-app notification by adding another server-to-notifications fallback**.

### Current static/native origins

The current native/static configuration declares canonical origins for `gova` plus the six workloads, with `gova` still acting as a generic API base. It has no control origin.

The target needs public origins for:

- `gova` public web/health/assets role;
- `notifications`;
- `products`;
- `orders`;
- `profiles`;
- `submain`;
- `sub2main`;
- `control`.

`gova` must no longer be required as a generic business API base.

---

## Target architecture and non-negotiable invariants

### Vercel projects

After the migration there are eight declared Vercel runtimes/accounts in repository metadata:

1. `gova` — GitHub linked; frontend/pages/static/`.well-known`/health only.
2. `control` / project `asol-control` — CLI/Sandbox managed; deployment authority + administrative operations.
3. `notifications` — notification APIs and push delivery.
4. `products` — product/catalog read workloads.
5. `orders` — order-list read workload.
6. `profiles` — profile/review/storage read workloads.
7. `submain` — auth and cross-domain user workloads.
8. `sub2main` — seller/product/profile/storage writes.

Only `gova` may be Git-linked. The other seven projects must have no Git repository integration.

### Six product/workload deployment targets stay six

The following set remains the product/workload deployment set:

`notifications`, `products`, `orders`, `profiles`, `submain`, `sub2main`.

`control` is operational infrastructure and must not be added to:

- `SERVICE_PHASE_IDS`;
- `ALL_DEPLOY_PUSH_TARGETS`;
- six-service smoke loops;
- product-service counts or labels.

Give control its own readiness/build/smoke/identity checks.

### Runtime isolation

For every application runtime (`gova`, six workloads, and the control **route runtime**):

- no foreign Vercel deployment token;
- no foreign team/project ID;
- no mirrored full account-declaration barrel when only one account door is needed;
- no sibling ASOL public URL in server runtime merely to call that sibling;
- no backend `fetch`/HTTP client to implement business behavior through another ASOL deployment;
- no sibling secret ownership.

The **control deployment worker/Sandbox** is the only administrative exception. It may hold the deployment credentials/metadata required to deploy the six workloads and may issue non-business readiness/smoke probes to verify the release. Keep that knowledge inside deployment tooling/Sandbox state; never serialize it in a control API response or browser bundle.

### Identity and CORS

Keep the existing cross-origin identity model:

- browser requests use `credentials: 'omit'`;
- operations requiring identity carry the signed `x-asol-session-token` explicitly;
- do not add cross-origin session cookies or `credentials: 'include'`;
- keep the shared browser-request header contract in `@asol/service-runtime-core`;
- every receiving origin must answer the preflight required by its methods and headers.

`OPTIONS` is a transport/CORS concern, not a business ownership record. A pathname split by method across two destinations may legitimately need successful preflight behavior on both receiving origins. Business methods, however, must each have exactly one owner.

---

## Required execution sequence

### Phase 0 — Re-baseline the current repository before changing behavior

1. Read current project rules and relevant architecture/release/API/service-mirror docs.
2. Record the current commit SHA and `git status`.
3. Enumerate **all current** `src/app/api/**/route.ts` files from the filesystem; do not use an old count.
4. Parse each route file using TypeScript/AST-aware logic and inventory every exported HTTP method, including:
   - `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`, `HEAD` if present;
   - re-exported handlers;
   - arrow/function-variable exports;
   - dynamic route segments.
5. Search the application for every API transport bypass:
   - `fetch`;
   - `EventSource`;
   - `XMLHttpRequest` if any;
   - `<a href="/api/...">` or navigation to `/api/...`;
   - form actions;
   - `window.location` to API paths;
   - raw `/api/` literals.
6. Audit server execution outside `src/app/api`:
   - Server Components/pages/layouts importing repositories or database packages;
   - Server Actions (`"use server"`);
   - route handlers outside the normal API tree;
   - server-only feature initialization that makes `gova` depend on business databases/services.

**Deliverable inside code/tests, not another coordination note:** a machine-checked route+method inventory and a machine-checked list/guard for production client routing. This inventory becomes the source of truth for the migration.

### Phase 1 — Add migration guards before moving routes

Add focused tests/architecture checks that fail on the current undesired architecture and pass only as each migration step is completed:

1. **Route classification completeness:** every current business route+method has exactly one destination; health and `.well-known` are not business routes; dev routes are development-only.
2. **No production fallback:** a business route in web production/static/Android/iOS cannot resolve to `gova` or same-origin when its destination is missing.
3. **Gova production shutdown:** every business API method, including preflight attempts, is blocked on gova production while health remains functional.
4. **Account isolation:** service/control runtime graphs cannot contain foreign deployment credentials, project/team IDs, sibling backend URLs, or runtime HTTP calls to sibling ASOL services.
5. **Control separation:** control is never included in the six product-service phase/deploy-target arrays.
6. **Mirror contract parity:** each moved business handler preserves status, response shape/error code, auth rejection, method behavior, and required CORS behavior.
7. **No server data path on gova:** add a static/architecture check that prevents production gova pages/server code from importing business repositories or other server-only data capability paths outside explicitly allowed health/build infrastructure.

Do not make these tests depend on hardcoded route-file counts that will immediately rot.

### Phase 2 — Create the control declaration, package, and runtime

Create a real control account/runtime using current package conventions.

#### Declaration

Add `packages/account-declarations/src/accounts/control.ts` and `@asol/account-declarations/control`.

Target identity fields:

- `name: 'control'`
- `project: 'asol-control'`
- `tokenEnvVar: 'VERCEL_CONTROL_TOKEN'`
- `teamIdEnvVar: 'VERCEL_CONTROL_ORG_ID'` when the verified live account requires a team fallback
- `serviceDir: 'services/control'`

The declaration interface currently requires an account email. **Resolve the real live Vercel owner/account email before populating it; never invent it.**

Derive `requiredEnv` and `optionalEnv` from actual control route imports/capabilities. Do not copy the existing gova env list.

Update the declarations barrel, package exports, type union, declaration tests, and all exhaustive display/registry maps.

#### Control composition

Create `@asol/control-composition` following the existing composition architecture:

- private package;
- declared package export(s);
- focused tests;
- imports `@asol/account-declarations/control`, never the deploy-engine barrel merely to read account metadata;
- exact application seams only;
- registers the runtime/config/data ports actually needed by control routes;
- no broad feature barrels when an exact server seam is sufficient.

Register it in `CAPABILITY_PACKAGES` and `COMPOSITION_FEATURE_SEAMS` with precise ownership/seams. Update `test:compositions` to execute the new control composition test. Regenerate architecture docs from registries.

#### Control service

Create `services/control` using the current generated-service Next.js packaging pattern. Give it its own `/api/health` / readiness behavior and a control-specific sync/verify/build path.

Do not add control to the six product-service arrays. Aggregate commands may call a separate control step.

### Phase 3 — Build the exact route+method ownership matrix

Generate the matrix from the current route inventory. The following is the **target policy**, not permission to recreate removed historical routes. Apply it to methods/routes that actually exist; classify any additional current route by its real capability owner.

| Current route/method family | Target runtime |
|---|---|
| `GET /api/health` | `gova` |
| `/.well-known/**` | `gova` (not Business API) |
| `/api/dev/**` | development-only; blocked in gova production |
| `/api/super-admin/**` | `control` |
| `/api/system-logs/**` | `control` |
| `/api/ota/admin/**` | `control` |
| `/api/ota/access` | `submain` |
| `/api/notifications/**` | `notifications` |
| `/api/auth/**` | `submain` |
| `/api/account/**` | `submain` |
| `/api/contact` | `submain` |
| `/api/feature-flags` | `submain` |
| `/api/advertisements/**` | `submain` |
| `/api/follow/**` | `submain` |
| `/api/search/**` | `submain` |
| `/api/specialty-chat/**` | `submain` |
| `POST /api/orders/from-cart` | `submain` |
| `POST /api/orders/custom-request-from-profile` | `submain` |
| `GET /api/orders/[orderId]` | `submain` |
| actual methods of `/api/orders/[orderId]/actions` | `submain` |
| `GET /api/orders` | `orders` |
| product read methods under `/api/products*` including review reads | `products` |
| product write methods under `/api/products*` including helpful/reply | `sub2main` |
| `GET /api/pharmacy-profile-catalog` | `products` |
| write methods of `/api/pharmacy-profile-catalog` | `sub2main` |
| profile read methods under `/api/profile/**`, including review reads | `profiles` |
| profile write methods under `/api/profile/**`, including review helpful/reply | `sub2main` |
| profile-owned storage reads | `profiles` |
| storage upload/write/delete | `sub2main` |

Rules:

1. One business route+method -> one destination.
2. No implicit `gova` destination for an unclassified business operation.
3. Dynamic routes must be matched explicitly and tested.
4. Add `PATCH` to the bridge method model if any current classified route exports it.
5. Preserve the notification service's special `/api/notifications/send` grant-delivery surface even though it is intentionally absent from the normal ASOL API constant table.
6. Treat `OPTIONS` separately as receiving-origin transport behavior.

### Phase 4 — Expand client routing and eliminate production fallback

1. Extend `@asol/account-bridge` with `control` public routing while preserving the separate notification grant bridge.
2. Replace partial exact maps with a route classifier capable of the current exact and dynamic route set.
3. Add `NEXT_PUBLIC_ASOL_CONTROL_URL` / `controlUrl` through:
   - public env;
   - account-bridge port shape;
   - browser port registration;
   - static/native build configuration;
   - runtime tests.
4. Remove server-only generic API fallback from client-safe `public-env` behavior.
5. Change `buildAsolApiUrl()` so:
   - local development may use explicitly tested same-origin fallback;
   - web production/static/Android/iOS business calls require a classified destination and absolute origin;
   - missing origin fails with a deterministic routing/configuration error;
   - no production business call silently reaches gova.
6. Preserve `credentials: 'omit'` and explicit auth headers.
7. Audit and fix all bypasses found in Phase 0.

#### Required special client fixes

- **Super Admin artifact downloads:** the current Jobs UI uses a raw relative anchor for `/api/super-admin/.../artifacts/...`. A raw `<a>` cannot attach `x-asol-session-token`. Replace it with an authenticated control-origin binary download flow (`asolApi.getBinary()`/fetch-to-Blob or an equivalently secure signed-download contract). It must not fall back to gova.
- **System-log streaming:** native browser `EventSource` cannot attach arbitrary auth headers. Move the stream to a control-origin mechanism that preserves authentication (for example authenticated fetch streaming if compatible with the current implementation, or a narrowly signed stream URL designed and tested for that purpose). Do not make the stream public and do not send it to gova.

### Phase 5 — Expand service mirrors while preserving handler behavior

For each current route+method in the matrix:

1. Keep the canonical source implementation behavior intact.
2. Add only the mirror entry points/composition seams necessary for its destination runtime.
3. Run `services:sync` plus the control sync path.
4. Verify module closure for every generated runtime.
5. Compare source and destination handler contract using equivalent fixtures:
   - success status/body;
   - validation/error code;
   - authorization rejection;
   - headers relevant to behavior;
   - dynamic parameters;
   - multipart/binary behavior where applicable;
   - CORS/preflight at the receiving origin.

Do not write a shortened replacement handler merely because it is easier to mirror.

### Phase 6 — Move auth and administrative server dependencies to their real owners

#### `submain`

Move/mirror all current auth/account/contact/ads/follow/search/order-detail/action/specialty-chat/OTA-access handlers required by the matrix.

Derive `SUBMAIN_RUNTIME_REQUIRED_ENV_KEYS` and optional keys from the actual resulting import graph. Remove the current blanket inheritance from gova runtime env lists.

Auth must carry its actual dependencies, including session signing/password recovery/user database dependencies **only when the current imports prove they are needed**. Do not distribute auth secrets to unrelated runtimes.

#### `control`

Move/mirror the current Super Admin, system-log, OTA-admin, production-deploy, release-console/build-job server surfaces required by the matrix.

Derive the control env list from actual imports. It will likely include some combination of Super Admin/session verification, system-ops storage, OTA administration, deployment/Sandbox, callback, and release email configuration; the exact list must come from code, not this sentence.

Keep deployment-target credentials inside deployment tooling/Sandbox. Control HTTP responses must not expose target tokens, team IDs, project IDs, or secret material.

#### Production-deploy notification change

Remove the current callback-side backend HTTP delivery to notifications. Do not replace it with another backend call.

Preserve:

- terminal deployment status;
- logs;
- callback authentication;
- deployment email behavior;
- signed grants attached to a browser-observed/polled status where the current UI can deliver them using the browser notification bridge.

Add a regression test proving no production-deploy server path performs a sibling ASOL HTTP call.

### Phase 7 — Make `gova` truly frontend-only

This phase is more than returning `410` from API paths.

#### Production API guard

Extend the current centralized proxy/boundary so when:

- `NODE_ENV === 'production'`, and
- `ASOL_DEPLOYMENT_ACCOUNT === 'gova'`

then:

- `/api/health` remains functional;
- every Business API request is blocked before its source handler executes;
- `OPTIONS` to a Business API is also blocked on gova (successful preflight belongs on the owning service origin);
- `/api/dev/**` cannot execute;
- production-deploy paths may return the more specific `410` body `{ "error": "productionDeployMovedToControl" }`;
- other moved business APIs return `410` with `{ "error": "apiMovedToService" }`;
- query strings, trailing slashes, method variation, and preflight cannot bypass the guard;
- `/.well-known/**` remains outside the Business API shutdown and continues to work.

Do not modify the canonical source route implementations into 410 handlers.

#### Eliminate non-API server business execution

Use the Phase 0 audit to remove/move every remaining production gova server path that accesses business data or mutates state directly. Pages that currently depend on Server Components/Server Actions for business data must be converted to client/browser calls to the correct service or otherwise redesigned so the gova runtime has no business database dependency.

The final gova production runtime must not need Turso business credentials, R2 write credentials, auth signing secrets, password-recovery secrets, push-provider secrets, OTA admin secrets, deployment/Sandbox credentials, or release mail/callback secrets.

Keep only:

- frontend/public build configuration;
- public service origins needed by the browser bundle;
- gova deployment identity such as `ASOL_DEPLOYMENT_ACCOUNT=gova` if used by the guard;
- any narrowly proven server value needed for `/api/health` or non-business public association behavior.

Derive the exact retained names from imports and tests.

### Phase 8 — Refactor release/deployment authority to control

1. Move production-deploy HTTP ownership to control.
2. Make control/Sandbox the owner of `deploy:all`, `deploy:push`, `deploy:revision`, production callbacks, and deployment secrets.
3. Preserve the six workload deployment phase IDs exactly as six.
4. Update stale text such as `submain`/`sub2main` being "full apps"; they are workload runtimes.
5. Refactor `deploy:all` so the release behavior is:
   - preflight;
   - publish/push the intended `main` revision only when the command's current semantics require it;
   - deploy/verify the six workload projects;
   - wait for and verify the **GitHub-linked gova production deployment of the same SHA**;
   - never CLI-deploy gova a second time.
6. Keep `control` outside selectable product deploy targets. Control deployment/update is a separate operational action.
7. Extend Vercel guards so:
   - `gova` is the only project permitted to have Git integration;
   - all other declared projects, including control, must be Git-disconnected;
   - no service manifest/runtime carries foreign deployment account metadata.
8. Update account checks, release state, smoke tooling, resume logic, runbook/gate contracts, and tests to the new `gova + six workloads + control` model while keeping control outside six-service loops.

### Phase 9 — Migrate static, OTA, Android, and iOS routing

1. Add the verified control origin to canonical public platform defaults only after the real production alias is known.
2. Update static/OTA output configuration to validate every required destination origin.
3. Stop treating `NEXT_PUBLIC_ASOL_API_BASE_URL` / gova as the generic business API endpoint for static/native builds.
4. Keep a gova public-web/health/assets origin if required, but separate that concept from Business API routing.
5. Update `build:static:local`, Capacitor build scripts, OTA runtime config, native defaults, origin resolution, and runtime validation.
6. Make runtime tests prove that representative routes for every destination resolve correctly in:
   - web production;
   - static export;
   - Android;
   - iOS.
7. Update deployed-origin smoke behavior:
   - each of the six workloads still gets a real workload/data probe;
   - control gets a separate operational readiness/auth-boundary probe;
   - gova is probed through health/frontend readiness, not a business-data route that is intentionally 410.

### Phase 10 — Bootstrap `asol-control` before workflow cutover

This is an atomic cutover rule.

1. Before changing the GitHub workflow endpoint, verify the live Vercel account and whether project `asol-control` exists using existing Vercel primitives. Do not print token values.
2. Ensure the control project has **no Git integration**. If creation is needed, use the existing project tooling that creates a Next.js project without Git integration.
3. Deploy a seed/control candidate from the exact migration revision through the authorized CLI/Sandbox path.
4. Capture the **actual production alias returned/verified by Vercel**. Never assume `https://asol-control.vercel.app`.
5. Textually probe the deployed control health endpoint and the GitHub deploy endpoint's expected authentication boundary/status behavior. A 404 is not acceptable proof.
6. Only after that seed is verified:
   - set the canonical/public control origin used by clients/static/native;
   - update the production GitHub workflow from the current gova deploy endpoint to the verified control origin + `/api/super-admin/production-deploy/github`;
   - update callback base/origin assumptions;
   - ensure the OIDC verifier still binds the exact repository/workflow/event/revision contract.
7. There must never be a revision where the workflow points to an unverified/nonexistent control endpoint and there must be no fallback to the old gova production-deploy route.

The public control origin is not a secret, but it still must come from the verified seed deployment rather than a guessed domain.

### Phase 11 — Least-privilege Vercel environment migration

Build an env ownership report from actual runtime imports and account declarations. Report **names only**.

For every runtime key move/removal:

1. prove the destination runtime actually imports/needs it;
2. prove the destination key exists (`present` only, never value);
3. build/sync/verify that runtime;
4. exercise the relevant local/authorized route contract;
5. only then remove the key from the previous runtime during an authorized live cleanup.

Final ownership requirements:

- `gova`: no business DB/R2/auth/push/OTA-admin/deployment secrets;
- `submain`: only auth/user/search/order-detail/action/etc dependencies proven by its graph;
- `sub2main`: only seller/product/profile/storage-write dependencies proven by its graph;
- read services: only their domain data/storage dependencies;
- notifications: only notification DB/grant/push-provider dependencies;
- control route runtime: only administrative/session/system-ops/OTA/release dependencies proven by its graph;
- control deployment runner/Sandbox: deployment credentials for the six targets and gova verification as the explicit operational exception.

After an authorized successful cutover, rotate credentials that were broadly exposed during migration, remove obsolete values from all Vercel projects, refresh the encrypted local secret archive using existing secret tooling, and verify names-only state again.

### Phase 12 — Cloud Accounts UI and documentation

Update the Super Admin cloud-accounts reference/UI to reflect the final architecture. Keep the client component free of secret values and secret variable names.

Display roles accurately:

- `gova`: frontend/pages/static assets/`.well-known`/health; GitHub connected.
- `asol-control`: deployment authority, Super Admin operations, system logs, OTA admin; not GitHub connected.
- `submain`: auth/account/contact/ads/follow/search/order creation/detail/actions/specialty chat/OTA access according to the final route matrix.
- `orders`: order-list read workload.
- `sub2main`: seller/product/profile writes and uploads.
- `products`: product/catalog/review reads according to final matrix.
- `profiles`: profile/review/profile-storage reads according to final matrix.
- `notifications`: notification APIs and delivery.

Update Turso/R2 reader descriptions so `gova` is removed wherever it no longer has runtime access.

Update relevant English documentation, including architecture/isolation, build gates, service bridge, notification bridge, cloud-account architecture, production deployment, deployment targets, environment variables, and diagrams.

Run registry-driven generation (`architecture:docs` / `docs:generate` as appropriate). Never hand-edit generated reference files to repair counts.

---

## CORS and route-contract requirements

For every destination route:

1. Use the shared `@asol/service-runtime-core` browser header contract.
2. Advertise only the methods the destination actually receives plus `OPTIONS`.
3. Preserve `x-asol-session-token` support.
4. Do not add `Access-Control-Allow-Credentials`.
5. Do not require a service runtime to know another Vercel project's identity just to validate CORS.
6. Test authenticated and unauthenticated preflight/request pairs.
7. For a pathname split by method between services, test each receiving origin independently.

A successful Vercel `READY` state is not sufficient. The migrated route must answer its real contract.

---

## Required verification commands

Run the focused tests as they are created, then the repository's current gates. At minimum, keep these current command surfaces passing (update `package.json` only when a new control-specific test/aggregate must be wired in):

```bash
npm run services:sync
npm run services:verify
npm run services:build
npm run test:account-declarations
npm run test:account-bridge
npm run test:service-bridge
npm run test:service-runtime-core
npm run test:vercel-deploy-core
npm run test:release-core
npm run test:deployment-tools
npm run test:compositions
npm run test:notifications
npm run test:system-logs
npm run test:auth-email-uniqueness
npm run test:account-deletion-registry
npm run test:cloud-accounts
npm run typecheck
npm run lint
npm run architecture:check
npm run runtime:check
npm run runtime:check:web
npm run runtime:check:static
npm run runtime:check:android
npm run runtime:check:ios
npm run architecture:docs
npm run docs:generate
npm run docs:ci
npm run build
```

Also add and run focused migration tests for:

- exact current route+method classification;
- gova production API shutdown;
- no production/static/native same-origin fallback;
- control-runtime mirror/build/readiness;
- server-side account isolation and no sibling business HTTP calls;
- production-deploy notification callback isolation;
- control exclusion from six-service phase/deploy-target arrays;
- authenticated Super Admin artifact download after control move;
- authenticated system-log stream after control move;
- source-vs-mirror route behavior parity;
- gova server-data-import prohibition.

If a command name changes during the migration, update this execution surface and its package scripts consistently; do not silently skip an equivalent gate.

---

## Final acceptance criteria

Do not declare the migration complete until all of the following are true:

1. `gova` is the only GitHub-linked Vercel project.
2. `control` and all six workload projects are Git-disconnected.
3. Repository account metadata contains eight runtimes/accounts after migration, while the product/workload deployment set remains exactly six.
4. Every current Business API route+method has exactly one correct business destination.
5. `OPTIONS`/CORS succeeds on every receiving service origin that needs preflight.
6. Web production, static export, Android, and iOS route directly to destination origins with no Business API fallback to gova.
7. Auth works cross-origin through the existing explicit signed-session-header model; no cross-origin cookie dependency is introduced.
8. Production gova returns `410` before executing all moved Business API handlers, including Business API `OPTIONS`; `/api/health` remains functional.
9. `/.well-known/**` remains functional.
10. No production gova page/Server Component/Server Action directly executes business database/storage logic.
11. Gova production no longer owns business DB, R2 server, auth signing, push provider, OTA admin, deployment, callback, or release-mail secrets.
12. `asol-control` owns deployment authority and the administrative route families defined by the final matrix.
13. `deploy:all` deploys/verifies the six workloads and waits for/verifies the GitHub-built gova deployment at the same SHA; it does not CLI-deploy gova again.
14. `control` is absent from `SERVICE_PHASE_IDS` and `ALL_DEPLOY_PUSH_TARGETS`.
15. No application backend uses another ASOL backend to implement business behavior.
16. Operational deployment smoke/readiness probes are confined to control deployment tooling/Sandbox and cannot become a business bridge.
17. The existing browser/native notification grant bridge still works.
18. Production-deploy callback no longer sends notification grants backend-to-backend; email/status remain correct and browser-observed grants remain deliverable.
19. Super Admin, system-log, and OTA-admin clients reach control and preserve their authentication/download/stream semantics.
20. Every runtime manifest/env set is least-privilege and validated names-only.
21. Cloud Accounts UI and English documentation describe the actual final architecture and generated references match registries.
22. All focused migration tests and the full required verification suite pass.
23. The workflow is switched to control only after a verified control seed/production alias exists.
24. No source route behavior, status code, error contract, authorization rule, or supported client flow is lost accidentally.

---

## Final execution report

At completion, produce one concise report containing:

- baseline SHA and final SHA;
- changed architecture summary;
- final route+method destination matrix (names/paths only);
- final runtime env ownership report (names and present/missing state only; no values);
- proof that only gova is Git-linked;
- verified public origins (public URLs only, no credentials);
- verification commands and results;
- any intentional behavior changes, especially production-deploy in-app notification timing;
- any live cutover/rotation step that remains pending explicit authorization.

Do not create another agent-coordination note. This file is the single migration instruction source.