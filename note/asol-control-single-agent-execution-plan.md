# ASOL Control — Atomic One-Shot Radical Cutover Contract

> **Execution model:** one agent, one uninterrupted migration transaction, one final architecture. No multi-agent split, no migration phases, no dual-run architecture, no manual handoff, no “finish later” state, and no silent compatibility loss.
>
> **Audited baseline:** `main` commit `ed0ce362b06fe6aba8adf1152e8a73b2b5af7c3f` on 2026-08-31. The repository at that exact revision is the baseline for every fact below. The implementation must re-read `main` immediately before editing and must regenerate machine inventories from the live tree if `main` has advanced.

## Mission

Perform a **single radical cutover** from the current mixed `gova` application/server runtime to a distributed architecture in which:

- `gova` is the **only GitHub-linked Vercel project**;
- `gova` contains the frontend/pages/static assets, `/.well-known/**`, `/api/health`, and only a **stateless transport-compatibility redirect boundary** required to keep already-running/installed clients working during and after the cutover;
- `gova` contains **no Business API implementation, no business database/storage execution, no administrative server capability, and no business secret**;
- `asol-control` is the operational control runtime for Super Admin server operations, system logs, OTA administration, build/release jobs, production deployment authority, Vercel Sandbox orchestration, callbacks, and release reporting;
- the six workload runtimes remain isolated: `notifications`, `products`, `orders`, `profiles`, `submain`, `sub2main`;
- new web/static/native clients call the owning runtime directly through one canonical route+method ownership registry;
- application backends never call sibling ASOL backends to implement business behavior;
- only the release-control plane may perform explicitly allowlisted cross-deployment operations: deployment/readiness/smoke verification and the existing terminal production-deploy notification delivery needed to preserve current behavior;
- one Git SHA is the release unit across `control`, the six workloads, and the GitHub-built `gova` frontend.

The result must preserve every currently supported user flow, API success/error contract, authorization rule, request/response body, method, binary/multipart/stream behavior, notification behavior, static/native behavior, deployment behavior, and data invariant unless an intentional change is explicitly approved by the invoking instruction.

## What “one-shot” means

This document contains an ordered execution sequence because distributed systems cannot be changed literally simultaneously. That order is **not a set of migration phases**. The agent executes it as one transaction from the current architecture to the final architecture:

- no intermediate architecture is accepted as “done”;
- no manual “continue?” checkpoint is inserted after execution starts;
- no compatibility shim that requires a later removal is introduced;
- no old backend remains as a hidden fallback;
- every precondition is checked before the first irreversible production mutation;
- once production mutation starts, failure triggers automatic rollback/compensation rather than a pause for instructions;
- the agent reports completion only after the final production topology and all final smoke checks are proven.

When the user explicitly instructs an agent to **execute this plan**, that execution instruction is the authorization to perform the complete transaction described here, including the final `main` push/cutover and the live Vercel changes required by the plan. Do not ask for another confirmation in the middle. If the user asks only to inspect, plan, or prepare, do not perform the live transaction and do not call the migration complete.

## Hard compatibility truth

The baseline code does **not** allow an honest claim that Business APIs can simply disappear from the `gova` hostname with zero breakage:

- the current generic account bridge maps only part of the API surface;
- unresolved browser routes currently fall back to the gova/main API origin;
- current/open web tabs and already-built static/Android/iOS artifacts can therefore still address Business APIs through `gova`.

A strict final state where `gova` returns only health/frontend and has **no compatibility transport boundary at all** is incompatible with “do not break any currently supported client” unless it is first proven that no supported client artifact or active bundle can address Business APIs through the old hostname. That cannot be assumed.

Therefore this plan makes the zero-business-logic solution explicit:

- canonical Business API route functions are **not shipped in the gova production artifact**;
- a tiny, secret-free, data-free transport boundary may remain in the gova request boundary solely to return `307` redirects from legacy Business API route+method requests to the canonical owner origin;
- the redirect target is generated from the same route+method ownership registry used by new clients;
- it never proxies a request body, calls another backend itself, reads a database, issues authorization, or implements business behavior;
- it is permanent compatibility transport, not a transitional fallback, so the final architecture does not require a later cleanup phase;
- `/api/health` stays local and is never redirected;
- new clients never depend on this boundary.

Before cutover, frozen pre-cutover client-routing fixtures must prove that `307` preserves the semantics of every currently supported legacy transport: normal JSON fetch, authenticated custom headers, multipart upload, binary download/navigation, SSE/EventSource, and every other transport found by the machine scan. If any supported transport cannot preserve its contract through a redirect, **no production mutation may start** until that compatibility problem is solved without reintroducing business execution into gova. The agent must fail closed rather than claim “100% no break” falsely.

## Audited baseline facts at `ed0ce362b06fe6aba8adf1152e8a73b2b5af7c3f`

These are facts to reconcile against the live tree before editing, not guesses:

1. GitHub code search at this revision reports **120 `route.ts` files under `src/app/api`**. Do not migrate from a hand-maintained subset.
2. `@asol/account-declarations` has seven declarations: `gova`, `notifications`, `products`, `orders`, `profiles`, `submain`, `sub2main`. There is no `control` declaration/export.
3. There is no `services/control` and no `packages/control-composition`.
4. `@asol/account-bridge` currently:
   - knows `products | orders | profiles | submain | sub2main` in its generic route bridge;
   - omits `PATCH` from its generic method union;
   - uses partial exact-path maps;
   - deliberately returns no service destination in local development;
   - returns `null` for unclassified routes.
5. `buildAsolApiUrl()` currently falls back from an unresolved service destination to the generic gova/main API base or page origin.
6. `src/instrumentation.ts` invokes the full `registerAppServerPorts()` composition root, and that root registers storage, orders, system logs, OTA, notifications, data, and other business server capabilities. A truly frontend-only gova build must not carry that graph.
7. `scripts/vercel-deployment-guards.ts` currently forms the hosted runtime key set from gova runtime keys **plus required env keys from every account declaration**. That must be replaced by per-runtime environment validation; otherwise gova cannot become least privilege.
8. `.github/workflows/deploy-main.yml` currently posts GitHub OIDC deployment requests to `https://gova-swart.vercel.app/api/super-admin/production-deploy/github`.
9. `deployExistingRevision()` currently starts the six isolated deployments and main verification with `Promise.allSettled`, so backend readiness and the GitHub-linked gova deployment are not ordered by an atomic readiness barrier.
10. `control` is not part of the current release at all. Keeping it as a manual “separate operational action” would let control drift behind the SHA being served and is not acceptable.
11. The production-deploy terminal callback currently delivers an in-app deployment notification even when no Super Admin browser is open. Removing that call would be a behavior regression.
12. The current system-log client opens the stream using raw `EventSource` and a relative `/api/system-logs/stream` URL with session data in the query.
13. Current Super Admin UI contains raw relative artifact download links, and API routes include binary/streaming and multipart surfaces. Baseline search finds `Content-Disposition`, `ReadableStream`, and `formData()` route behavior; the migration cannot assume JSON-only HTTP.
14. The current Vercel build command is `npm run build:vercel`; it validates environment, runs the normal root `next build`, and has no per-SHA backend-readiness wait.
15. The current remote deployment Sandbox is persistent and stores release state outside the serverless request. That property can be reused so a stable control alias can be redeployed while workflow polling continues, but the old/new control contract must be tested for compatibility.

## Non-negotiable final topology

### Vercel runtimes

Repository metadata must declare eight runtimes/accounts:

1. `gova` — GitHub-linked frontend/public runtime; no Business API implementation.
2. `control` / Vercel project `asol-control` — Git-disconnected operational control runtime.
3. `notifications` — Git-disconnected notification runtime.
4. `products` — Git-disconnected product/catalog read runtime.
5. `orders` — Git-disconnected order-list read runtime.
6. `profiles` — Git-disconnected profile/review/storage-read runtime.
7. `submain` — Git-disconnected auth/account/search/cross-domain user workload runtime.
8. `sub2main` — Git-disconnected seller/product/profile/storage-write runtime.

Only `gova` may have Vercel Git integration.

### The six workload set stays exactly six

The product/workload set remains exactly:

`notifications`, `products`, `orders`, `profiles`, `submain`, `sub2main`.

`control` must **not** be inserted into:

- `SERVICE_PHASE_IDS`;
- `ALL_DEPLOY_PUSH_TARGETS`;
- six-workload labels/counts;
- six-workload smoke loops that are specifically about product/workload services.

However, **every full production release must also deploy/verify control at the same SHA through its own mandatory release step**. “Not a workload target” must never mean “updated manually later”.

### No business federation

For application behavior:

- browser/native -> owning runtime is allowed;
- gova compatibility boundary -> HTTP redirect only is allowed;
- service -> sibling service business HTTP is forbidden;
- control route runtime -> sibling business HTTP is forbidden;
- service -> gova business HTTP is forbidden;
- gova -> service business HTTP is forbidden.

The only cross-deployment operational exception is release control:

- the persistent Sandbox/release worker may deploy accounts and perform readiness/smoke probes;
- the production-deploy terminal reporting path may deliver the existing signed deployment-notification grant to the notifications runtime so unattended deployments still notify exactly as before;
- this exception is allowlisted by exact code path and exact notifications endpoint and cannot be reused as a general HTTP client.

## Canonical route+method ownership registry

Create one canonical **pure** route ownership door inside the existing bridge capability, for example `@asol/account-bridge/routes`. It must not import `native-core`, React, server env, account tokens, or application features. Both the client router and the gova compatibility redirect boundary consume this exact door.

The registry is pattern+method based, not a loose pathname prefix table. It must support:

- exact routes;
- dynamic segments such as `[id]` and nested parameters;
- query strings without making the query part of ownership;
- normalized trailing slash handling;
- encoded path parameters;
- `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD` where actually exported;
- `OPTIONS` as transport behavior on each receiving origin rather than as business ownership.

Build a TypeScript-compiler/AST inventory of the live `src/app/api/**/route.ts` tree that detects exported HTTP handlers including direct functions, variables, aliases, and re-exports. The inventory test must fail when:

- a current Business API route+method has no owner;
- a Business API route+method has more than one owner;
- an owner pattern matches a nonexistent method by mistake;
- a new route appears without classification;
- a dynamic route cannot be resolved deterministically;
- a production business route resolves to gova.

Do not use a hardcoded route-file count as the long-term gate. The audited `120` count is evidence for this baseline only.

### Target ownership policy

Apply the following policy to the routes/methods that actually exist at execution time; the AST inventory is authoritative and any additional live route must be classified by its real capability before migration continues.

| Route/method family | Final owner |
|---|---|
| `GET /api/health` | `gova` |
| `/.well-known/**` | `gova` public surface, not Business API |
| `/api/dev/**` | local development only; never shipped as production Business API |
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
| order detail/action methods under `/api/orders/[orderId]/**` | `submain` |
| `GET /api/orders` | `orders` |
| product/catalog/review read methods | `products` |
| product/catalog/review write/helpful/reply methods | `sub2main` |
| profile/review/profile-storage read methods | `profiles` |
| profile/review/profile-storage write methods | `sub2main` |
| image/storage write/upload/delete methods | `sub2main` |

For a route that spans several data domains, **co-locate the orchestration in one owning workload runtime and grant only the exact data capabilities that route genuinely needs**. Do not split one request into service-to-service business calls merely to make account boundaries look narrower.

## Exhaustive transport inventory

Before changing any routing behavior, scan production source for every way a client can reach an API, including:

- `AsolApiClient` JSON calls;
- `getBinary` and raw binary fetch;
- `postForm` / `FormData` / multipart uploads;
- `EventSource` / SSE;
- `ReadableStream` consumers;
- `XMLHttpRequest` if present;
- direct `fetch` calls;
- `<a href="/api/...">` and generated artifact/download links;
- `window.location`, `location.assign`, `window.open`, form actions, router/navigation to API URLs;
- raw `/api/` literals;
- service worker/background requests;
- WebSocket/EventSource-like transports if later found;
- server-side absolute ASOL URLs;
- any helper that bypasses `buildAsolApiUrl()`.

Create a machine-enforced exception list for intentional non-`AsolApiClient` transports. Every listed exception must name its owner runtime and authentication mechanism. An unlisted direct API transport is a build failure.

Known baseline special cases that must be handled explicitly include:

- Super Admin build artifact downloads;
- Super Admin dev-cloud-backup downloads;
- system-log `EventSource` streaming;
- multipart image/upload routes;
- streaming artifact responses.

Do not make the system-log stream public. Native `EventSource` cannot attach arbitrary headers, so either retain a narrowly signed URL/query contract with equivalent validation at `control`, or replace it with authenticated fetch streaming while preserving reconnect/stream semantics. Do not send it to gova.

Replace raw relative Super Admin download anchors with a control-origin authenticated binary/download flow for new clients. Legacy relative links are covered only by the tested gova redirect boundary.

## Create `control` as a first-class isolated runtime

Add `packages/account-declarations/src/accounts/control.ts` and the `@asol/account-declarations/control` export.

Required declaration identity:

- `name: 'control'`;
- `project: 'asol-control'`;
- `tokenEnvVar: 'VERCEL_CONTROL_TOKEN'`;
- `teamIdEnvVar: 'VERCEL_CONTROL_ORG_ID'` only if the verified account scope requires it;
- `serviceDir: 'services/control'`.

Resolve the actual Vercel owner email/account and production alias through live Vercel tooling. Never invent them and never print tokens.

Create `@asol/control-composition` using the current sealed composition conventions:

- private independent package;
- declared public door(s) only;
- focused tests;
- exact application seams only;
- imports `@asol/account-declarations/control`, never a broad deploy-engine barrel merely for metadata;
- registers only control runtime ports;
- no broad feature barrel when an exact server seam is available.

Register it in architecture registries and composition seam registries and regenerate generated architecture documents. Derive counts from registries rather than editing stale numeric prose.

Create `services/control` using the existing generated-service pattern. Give it:

- `/api/health`;
- the migrated control-owned API routes;
- a read-only release-readiness endpoint keyed by full Git SHA that exposes only `pending | ready | failed` and no secrets/logs;
- control-specific sync, mirror-closure verify, build, smoke, and deploy commands.

The control sync/build command may be called by aggregate release tooling, but control remains outside six-workload arrays.

## Per-runtime environment ownership — no global hosted union

Replace the current global hosted environment check with account-specific runtime manifests.

The hosted build/runtime guard must know **which runtime it is validating** and check only that runtime’s declared requirements. It must be impossible for `gova` build validation to demand a key merely because another account declaration requires it.

Requirements:

- `gova`: public client origins/build metadata and narrowly proven public/health values only; no business DB, R2 write, auth signing, password recovery, notification provider, OTA admin, deployment, callback, mail, or foreign Vercel credentials;
- `control`: only administrative/session/system-ops/OTA/release values proven by its route graph;
- release Sandbox: deployment credentials and metadata needed to deploy/verify control + six workloads + verify gova, passed to the Sandbox/release tooling rather than serialized through HTTP responses;
- `notifications`: notification DB/grant/provider values only;
- read services: only their domain read/storage dependencies;
- `submain`: only auth/user/search/cross-domain dependencies proven by its resulting graph;
- `sub2main`: only seller/product/profile/storage-write dependencies proven by its resulting graph.

Generate a names-only report from actual imports/declarations and fail if a runtime contains a foreign deployment token, foreign account metadata, or unnecessary secret family.

## Remove every business server capability from the gova artifact

A `410` guard alone is **not** the final architecture. The final Vercel artifact for gova must physically omit Business API functions.

Implement a dedicated gova deployment build view from the canonical repository, using generated/deployment-tree tooling rather than rewriting source handlers into stubs:

- canonical Business API source handlers remain real in the repository so service mirrors can consume them;
- the gova production build view includes frontend/pages/static/public assets, `/.well-known/**`, `/api/health`, and the stateless compatibility redirect boundary only;
- Business API route modules are omitted from the app tree that Vercel compiles for gova;
- production dev routes are omitted;
- gova uses a minimal server/instrumentation composition root that does not register data, storage, orders, system logs, OTA admin, notifications, or other business ports;
- source generation must be deterministic and verified for drift.

Add post-build artifact gates that inspect Next manifests and file traces and fail unless:

- no Business API function exists under `.next/server/app/api` except health;
- no production dev API exists;
- no forbidden business capability package appears in a gova server trace;
- no business database/storage/provider secret name is required by the gova trace/env manifest;
- the redirect boundary imports only the pure route registry + public origin configuration and no business capability.

The gova compatibility boundary must perform only route+method classification and `307` redirect. It must not use `fetch`, `AsolApiClient`, DB/storage code, notification code, or server secrets.

## Eliminate routing fallback in every environment

The final account bridge has **no generic business fallback to gova**, including local development.

For web production, static export, Android, iOS, and local distributed development:

- every Business API method resolves to exactly one owner from the canonical registry;
- every owner has an explicit absolute origin for that runtime context;
- missing owner/origin throws a deterministic configuration/routing error;
- `buildAsolApiUrl()` never silently substitutes gova/page origin for a Business API;
- `NEXT_PUBLIC_ASOL_API_BASE_URL`, legacy generic API URL keys, and `ASOL_API_BASE_URL` are not used as a Business API destination;
- gova public-web/health origin is a separate concept from API ownership.

Add `NEXT_PUBLIC_ASOL_CONTROL_URL`/`controlUrl` through public env, bridge ports, registration, static/native build configuration, deployed-origin resolution, and tests.

### Local development must mirror production topology

Remove `usesLocalDevelopmentFallback()` behavior that routes unresolved development traffic back to gova.

Create one deterministic `dev:distributed` (or equivalent current naming) orchestration command that starts:

- gova frontend;
- control;
- notifications;
- products;
- orders;
- profiles;
- submain;
- sub2main;

on centrally declared local origins/ports. The client bridge uses those origins exactly as production uses public origins. The command must handle startup order/readiness, teardown, stale PID/port recovery, and must not require `npm ci` per service. Local smoke must exercise at least one real owned route for every destination plus the gova health and compatibility redirect boundary.

## Preserve identity and CORS exactly

Keep the current cross-origin identity model:

- `credentials: 'omit'`;
- signed `x-asol-session-token` for authenticated operations;
- no cross-origin session cookies;
- no `credentials: 'include'`;
- shared browser-request header contract from `@asol/service-runtime-core`;
- CORS/preflight implemented on every receiving origin.

`OPTIONS` belongs to each receiving transport origin and is not a second business owner. A pathname split by method across services must answer preflight appropriately on each service that receives one of its methods.

Test success/failure preflights, authenticated/unauthenticated requests, custom headers, multipart requests, redirects from legacy gova, and dynamic paths.

## Preserve production-deploy notification behavior

Do **not** remove the current unattended terminal in-app deployment notification.

Move the existing behavior from gova to the control/release plane and keep its exactly-once state:

- terminal status persists;
- logs persist;
- callback authentication persists;
- deployment email persists;
- browser-observed signed grants remain deliverable through the existing browser/native notification grant bridge;
- when no browser is open, the release-control path still delivers the terminal deployment notification as it does today;
- `inAppNotified`/equivalent state prevents duplicate delivery.

This is the one explicit operational cross-deployment notification exception. Enforce it with a narrow static allowlist: only the production-deploy terminal notification path may call the notifications send endpoint from release/control code. No generic sibling-ASOL absolute HTTP helper may be introduced.

Control does not receive notification database or FCM/APNs/Web Push provider credentials merely for this operation; it uses the existing signed grant contract and the notifications service remains the push-delivery owner.

## Make release publication safe for every direct `main` push

The current race — GitHub-linked gova building while `deploy:revision` deploys services — must be removed.

Introduce a **release-readiness barrier keyed by the full Git SHA** using the persistent release/Sandbox state already owned by the control plane (or an equivalently durable control-owned operational store if required by the implementation). The state must survive a control deployment and must be readable by the new control revision.

The full release contract for a pushed SHA is:

1. GitHub push creates the candidate SHA and starts both the gova Git build and the deployment workflow.
2. The gova `build:vercel` command immediately enters a bounded readiness wait for that exact SHA **before producing a publishable frontend artifact**.
3. The workflow calls the stable `asol-control` production alias, authenticated with the existing GitHub OIDC identity contract, to start `deploy:revision` for that exact SHA.
4. The persistent Sandbox checks out the exact SHA and restores release secrets internally.
5. The Sandbox deploys/verifies the **six workloads** for that SHA and deploys/verifies **control** for that SHA through a separate mandatory control step.
6. Real route probes, not health alone, verify each workload; a control operational/auth-boundary probe verifies control.
7. Only after all seven Git-disconnected runtimes are READY and their probes pass does the release state for that SHA become `ready`.
8. The gova Vercel build observes `ready`, runs the gova-only deployment build, passes the no-Business-API artifact scan, and is allowed to complete/publish.
9. The release worker waits for the GitHub-linked gova production deployment of the **same SHA** to become READY.
10. Final deployed smoke exercises gova frontend/health/legacy redirects, control, and every workload origin.
11. Only then is the release marked succeeded and terminal reporting sent.

A `failed` release state makes the gova build fail closed so the previous production gova deployment remains active. A timeout is failure, never permission to publish.

### Control self-update continuity

A full release must update control when control inputs changed. The control alias that receives the request may therefore switch from revision N to N+1 while the Sandbox is still running.

Add compatibility tests proving:

- old control can start a Sandbox release for the candidate SHA;
- candidate control can read/poll the existing persistent run state;
- workflow GET polling continues across control alias promotion;
- callback payload/state schema is backward/forward compatible for the transition;
- callback lands successfully after control alias promotion;
- no release lock is lost or duplicated during self-update.

`control` remains outside workload arrays even though this top-level control deployment step is mandatory.

### Readiness cannot be forged

The gova build may call a read-only readiness endpoint that exposes only revision + status. The public endpoint cannot mutate release state. Only the authenticated control/Sandbox release path can mark a SHA ready. Validate full 40-character SHAs and bind readiness to the exact repository revision.

### Targeted/manual deploys do not unblock gova

Existing targeted service commands may remain for maintenance, but a partial/targeted deployment must **never** mark a full SHA ready for gova publication. Only the complete control + six workload proof may release the gova build barrier.

## Automatic rollback/compensation — no pause after mutation starts

Before the first live production mutation, capture names/IDs of the currently promoted production deployments/aliases for:

- gova;
- control if it already exists;
- all six workloads.

Do not print secret values.

If any control/workload deployment or real probe fails before the SHA becomes ready:

- mark the release failed;
- keep/fail the gova build barrier so the old gova production deployment remains active;
- automatically re-promote every workload/control project already changed in this transaction to its captured previous production deployment when the platform supports promotion rollback;
- verify the restored endpoints before returning failure.

If gova publishes but final deployed smoke fails:

- automatically promote the captured previous gova production deployment;
- restore the captured previous control/workload deployments as needed;
- verify the restored topology;
- mark the release failed and report the rollback.

Do not remove old required secrets or rotate credentials until the new topology has passed all final smoke checks. Keep an encrypted restorable snapshot through the transaction. After success, perform the planned secret removals/rotations in the same execution and then rerun final names-only env checks and smoke. If secret cleanup fails, restore the previous credential state automatically and report failure rather than leaving a half-cleaned topology.

## Mirror and behavior migration rules

For every current Business API route+method:

1. Preserve the canonical implementation; do not replace it with a simplified migration stub.
2. Put it in the owning runtime’s mirror/deployment graph only.
3. Register all required composition/data/config ports for that runtime, including Turso-only/remote-data-source behavior where required.
4. Remove foreign package/env edges exposed by the mirror graph.
5. Compare canonical-vs-deployed handler contract with equivalent fixtures:
   - success status/body;
   - validation/error code;
   - auth rejection;
   - headers that affect behavior;
   - dynamic params;
   - query behavior;
   - multipart/binary/stream behavior;
   - notification grants;
   - CORS/preflight.
6. Exercise a real deployed route that reaches each runtime’s data/capability; Vercel `READY` and `/api/health` alone are not proof.

Generalize service-mirror tooling so control can participate in aggregate sync/verify/build through an explicit runtime kind without pretending control is a seventh workload service.

## Auth, account deletion, and cross-domain orchestration

Move all current auth/account/contact/ads/follow/search/order-detail/order-action/specialty-chat/OTA-access methods assigned to `submain` without changing their contracts.

Derive `SUBMAIN_RUNTIME_REQUIRED_ENV_KEYS` and optional keys from the resulting graph; remove blanket inheritance from gova runtime env lists.

For account deletion or another operation that legitimately spans multiple data shards/domains, keep one authoritative owner runtime and give that owner the exact needed data ports/credentials. Do not create a chain of backend-to-backend business requests.

Session signing, password recovery, user DB access, Super Admin identity checks, and notification grant issuance must remain with only the runtimes whose imports prove the need.

## Static export, OTA, Android, and iOS

Add canonical public origins for all final destinations:

- gova public web/health;
- control;
- notifications;
- products;
- orders;
- profiles;
- submain;
- sub2main.

Do not treat gova as a generic Business API base.

Update all static/native origin injection and validation surfaces, including current native defaults, OTA/static output configuration, runtime checks, deployed-origin resolution, and build scripts. Public URLs are not secrets, but use verified production aliases rather than guessed domains.

Tests must prove representative exact and dynamic routes for every owner in:

- web production;
- static export;
- Android;
- iOS;
- distributed local development.

Freeze a pre-cutover client routing fixture from the baseline and run every owned route+method through the legacy gova `307` compatibility boundary. This is required evidence that existing supported bundles are not broken by the radical cutover.

## First control bootstrap without a broken revision

The first migration has a bootstrap problem: the current workflow points to gova, while the final workflow must point to control. Solve it inside the same transaction without ever committing a workflow that targets a nonexistent control endpoint.

Before the final migration push:

1. verify the real Vercel account scope and whether `asol-control` exists;
2. create it with the existing Git-disconnected project tooling if needed;
3. deploy a seed control runtime from the exact migration candidate that already implements the stable GitHub OIDC deploy endpoint, readiness read endpoint, Sandbox state contract, callback contract, and health endpoint;
4. verify it by its actual Vercel production alias and auth-boundary behavior;
5. verify it has no Git integration;
6. record that verified alias in the candidate’s public/control origin configuration and workflow endpoint;
7. only then push the final migration commit to `main`.

The pushed commit contains the final workflow that points directly to the already-verified stable control alias. There is no fallback to the old gova deploy endpoint and no later “switch workflow” phase.

The seed is not an accepted intermediate architecture; it is a bootstrap precondition inside the one transaction and must be immediately superseded/verified by the exact final SHA through the normal release barrier.

## Gova Git integration and build guard

Keep `gova` as the only Git-linked project and retain repository policy that only deployable `main` pushes trigger a Vercel build.

Change `build:vercel` so it performs, in order inside the same build command:

- host/toolchain checks;
- exact-SHA control readiness wait;
- **gova-only** per-runtime environment validation;
- deterministic gova deployment-tree generation;
- Next build of that gova-only tree;
- artifact route/trace/secret-owner scan;
- function-size/upload guard.

It must not run the full correctness suite on Vercel; correctness remains proven by local/release gates. The readiness wait is release coordination, not application CI.

## Secret migration and final cleanup

Build a names-only env ownership report before live mutation. For each move/removal:

- prove destination import need;
- prove destination value is present without printing it;
- build/smoke destination;
- remove obsolete source value only after final topology smoke;
- rotate credentials that were unnecessarily present on gova or another runtime, using existing secret tooling;
- refresh the encrypted secret archive;
- verify all projects again names-only.

No foreign Vercel token/team/project identifier may remain in an application runtime. Deployment target credentials belong to release tooling/Sandbox only.

## Cloud Accounts UI and documentation

Update the Super Admin Cloud Accounts reference and rendered UI to reflect the exact final roles and verified public metadata. Client components must not contain secret values or secret variable names.

Update Turso/R2 reader descriptions so gova is removed wherever it no longer has runtime access.

Update the relevant English architecture/release/API/bridge/notification/environment documentation and diagrams. Modify registry/source documents, then regenerate generated architecture/docs; never hand-edit generated count/reference files.

The final docs must describe the permanent legacy transport redirect boundary accurately so future agents do not mistake it for a business fallback or delete it without first changing supported-client policy.

## Required automated guards

Add permanent gates for all of the following:

- complete route+method ownership from AST inventory;
- no Business API owner `gova`;
- pure route registry has no runtime/vendor/app dependencies;
- no unclassified direct API transport;
- no business same-origin fallback in any runtime mode;
- distributed local dev uses explicit origins;
- gova production build contains no Business API function except health;
- gova server traces contain no forbidden business packages;
- gova runtime env manifest contains no business secrets;
- hosted env validation is per runtime, never a union of all declarations;
- control exists in declaration/package/service/aggregate verification;
- control is absent from six-workload arrays;
- full release always deploys/verifies control separately at the same SHA;
- gova build cannot publish before exact-SHA control+six readiness;
- `deploy:revision` cannot verify main concurrently with unfinished backend/control deployment;
- targeted deploy cannot mark a full release ready;
- old/new control revisions share release state/callback contracts safely;
- only gova may be Git-linked;
- no application backend performs sibling ASOL business HTTP;
- only the exact production-deploy notification operational exception is allowlisted;
- terminal in-app deployment notification remains exactly-once even with no browser open;
- CORS/OPTIONS works at every receiving origin;
- legacy gova `307` compatibility works for every supported baseline transport;
- Super Admin binary downloads work through control;
- system-log stream works through control with authentication;
- route source/mirror/deployed contract parity;
- rollback metadata is captured before production mutation and rollback paths are testable without secret disclosure.

## Verification surface

Run focused migration tests continuously, then the full current repository gates. At minimum preserve/extend these command surfaces:

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

Add explicit commands/gates for:

- control sync/verify/build/smoke;
- gova deployment-tree generation and artifact scan;
- route ownership inventory;
- client transport inventory;
- legacy compatibility redirect matrix;
- per-runtime env ownership;
- release-readiness barrier;
- control self-update continuity;
- automatic rollback simulation.

Then run real deployed smoke after live cutover. A local build, Vercel `READY`, or health-only response is never sufficient by itself.

## Final acceptance — all must be true in one completed execution

Do not call the migration complete unless **every** item below is true simultaneously:

1. The final production SHA is known and matches the intended migration commit.
2. `gova` is the only Git-linked Vercel project.
3. `control` and the six workloads are Git-disconnected.
4. Repository metadata declares eight runtimes/accounts.
5. The workload set remains exactly six and excludes control.
6. The full release deploys/verifies control separately at the same SHA; control is not a manual-later task.
7. Every live Business API route+method from the AST inventory has exactly one non-gova owner.
8. New web/static/Android/iOS/local clients resolve every Business API directly to its owner with no gova fallback.
9. The permanent gova compatibility boundary redirects legacy Business API route+method requests without executing business code and passes all frozen supported-client transport tests.
10. `/api/health` and `/.well-known/**` remain functional on gova.
11. The built gova artifact contains no Business API function other than health and no production dev API.
12. Gova server traces/instrumentation do not register or import business DB/storage/orders/system-log/OTA-admin/notification/release capabilities.
13. Gova production environment contains no business database/storage/auth/push/OTA/deployment/callback/mail secrets.
14. Hosted environment validation is per runtime and gova no longer demands other accounts’ required env keys.
15. `control` owns Super Admin/system-log/OTA-admin/release server surfaces and preserves their status/auth/download/stream contracts.
16. Auth/account/search/order-detail/action/cross-domain user workloads operate from their declared owner without backend federation.
17. CORS/preflight succeeds on every real receiving origin and cross-origin auth remains explicit-header + `credentials: 'omit'`.
18. No application backend implements business behavior by calling another ASOL backend.
19. The production-deploy terminal in-app notification still arrives exactly once when no browser is open; deployment email/status/logs also remain correct.
20. The browser/native notification-grant bridge remains functional.
21. The GitHub workflow calls the verified stable control alias, never the old gova deploy endpoint.
22. The gova Git build for a SHA cannot publish until control + all six workloads for that SHA are READY and real probes pass.
23. `deploy:revision` no longer races main verification against unfinished service/control deployment.
24. Old->new control self-update preserves polling, callback, lock, and release state.
25. A failed pre-publication release leaves/reinstates the previous production topology automatically.
26. A failed post-publication smoke automatically restores the captured previous production topology.
27. Static export, OTA, Android, and iOS contain the verified final origins and no generic gova Business API base dependency.
28. Runtime env ownership is least privilege and verified names-only.
29. Cloud Accounts UI and English/generated documentation match the live final architecture.
30. All focused migration tests, full repository gates, and real deployed smoke pass.
31. No live cutover, environment cleanup, credential rotation, or verification step is left “pending”. If the live transaction was not authorized/executed, report **not complete** rather than redefining completion.
32. No current supported user flow, API contract, authorization rule, binary/multipart/stream behavior, notification behavior, or supported client routing behavior is lost.

## Final report

Produce one concise final report only after the complete transaction finishes. Include:

- audited baseline SHA and final SHA;
- verified final runtime/project topology;
- full generated route+method ownership report (paths/methods/owners only);
- verified public origins only;
- names-only per-runtime env ownership/presence report;
- proof only gova is Git-linked;
- control + six + gova exact-SHA release/readiness proof;
- gova artifact scan proof;
- legacy compatibility redirect proof;
- verification commands/results;
- real deployed smoke results;
- rollback result if rollback was exercised;
- credential cleanup/rotation completion status without values.

Do not produce a “partial success” completion report. If any acceptance criterion fails, the migration is not complete and the production transaction must already have been automatically rolled back or must never have crossed the publication barrier.
