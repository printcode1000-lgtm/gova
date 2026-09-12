# Live Simulation Mode Implementation Plan

## Objective

Build a development-only, 100%-real simulation environment for the nine persistent Turso simulation users plus Super Admin. Each actor must behave like an independent real user of Gova, using real signed sessions, real Turso data, real business APIs, real order/service mutations, and real notification routing.

The isolation model is now **one actor = one browser origin = one fixed development port**. Browser origin isolation is the primary barrier against cross-account IndexedDB, AsolDB, TanStack Query, localStorage, sessionStorage, Cache Storage, Service Worker, Web Push, BroadcastChannel, and other browser-local state collisions.

This plan is authoritative. After implementation, re-read it and audit every acceptance item against code, automated tests, browser evidence, Turso state, notification state, and documentation.

## Non-negotiable invariants

1. Simulation actors use the real Turso users/profile/product/order/notification data planes. No fake repository, mock business state, or synthetic order mutation.
2. Buyer/seller/provider sessions come from the real authentication path using server-only `SIM_*` credentials. Plaintext passwords never enter browser bundles, logs, docs, screenshots, or route responses.
3. Super Admin uses its real canonical UID/phone and a normal signed session.
4. Simulation exists only in strict local development and is absent/unreachable in production.
5. Each actor owns one stable port/origin, so browser persistence is separated by the browser itself.
6. Switching actors navigates between origins and restores that actor's previous route/state rather than creating a new identity.
7. The default application state is normal development mode with simulation **disabled**.
8. Turning simulation off must hide the actor toolbar and restore the ordinary development UI/behavior.
9. Notifications remain real business notifications addressed to real UIDs.
10. Existing production auth, notification, storage, Super Admin, and deployment contracts must not be weakened.
## Fixed actor ports

| Port | Actor |
| ---: | --- |
| `3002` | Buyer 01 |
| `3003` | Buyer 02 |
| `3004` | Buyer 03 |
| `3005` | Seller 01 |
| `3006` | Seller 02 |
| `3007` | Seller 03 |
| `3008` | Provider 01 |
| `3009` | Provider 02 |
| `3010` | Provider 03 |
| `3011` | Super Admin |

These ports are stable development identities. Do not allocate them dynamically because stable origins are what make each actor's browser state durable across reloads and future sessions.

## Architecture decision: one Next.js runtime, ten public origins

Do not run ten independent Next.js dev builds unless verification proves a proxy cannot preserve required behavior. Preferred architecture:

- Run one canonical Next.js development server on an internal port, e.g. `3100`.
- Run a lightweight development origin gateway/proxy exposing ports `3002` through `3011`.
- Forward HTTP, RSC, HMR/WebSocket, API, static asset, Service Worker, and browser requests to the same canonical Next.js runtime.
- Preserve the incoming actor port/origin for browser-facing URL generation and same-origin behavior.
- Map the incoming port to one allow-listed actor key on the server when simulation mode is enabled.
- Never let a client choose an arbitrary UID via query/body/header.
## Simulation switch in Super Admin development area

- Add one explicit **Simulation Mode** switch inside the Super Admin development tooling area, not as a production setting.
- The switch default is **OFF** on a fresh browser/origin and after simulation metadata is cleared.
- OFF means the project behaves exactly like the ordinary development environment: no actor toolbar, no automatic actor bootstrap, no simulation routing assumptions, and the existing developer badge/menu remains available.
- ON enables the simulation control plane and reveals the fixed top actor toolbar.
- Turning OFF while inside any actor origin must persist that actor's current resume route, disable simulation control state, hide the toolbar, and navigate back to the canonical ordinary development origin/state.
- Turning ON starts from the selected/default actor origin without deleting or resetting any actor's persisted browser state.
- The switch itself must remain reachable from the Super Admin development area even when the top actor toolbar is hidden.
- Simulation enablement is development-control metadata only. It must not be stored in user Turso profiles or affect real account settings.

## Actor toolbar

- When Simulation Mode is ON, render one fixed top toolbar above the normal application header.
- It contains buttons for the nine simulation users plus Super Admin and clearly highlights the active actor.
- The ordinary floating developer badge/menu is hidden while this toolbar is active so the simulation surface is visually unambiguous.
- The toolbar is rendered from root development composition so it survives every application route.
- Use the existing top-overlay CSS contract to push the normal header/content below the toolbar rather than hard-coded per-page spacing.
- The toolbar is overlay chrome and must not pollute page snapshots/attribute inspection/application content.
- Each button navigates to the fixed port for that actor and restores its most recent safe route.
- Multiple actors may remain open simultaneously in separate tabs/windows because each port is a separate origin.
## Real identity acquisition

- Add a development-only simulation bootstrap/session endpoint guarded by the existing strict development runtime policy.
- Resolve actor identity primarily from the trusted incoming actor port mapping, not from arbitrary client UID input.
- For the nine simulation users, read server-only `SIM_*` credentials and execute the same auth/login service used by ordinary login.
- Verify UID, normalized phone, provider flag, and specialties against the fixed simulation registry before activating the session.
- Store the returned normal signed session in that origin's ordinary AsolDB `AUTH/current` row. No special fake-session shape.
- For Super Admin, use the canonical Super Admin identity and a normal signed session consistent with existing authorization checks.
- Session bootstrap must be idempotent: revisiting the actor origin restores its existing valid session when possible and only refreshes/re-authenticates when needed.
- Ordinary login/logout outside Simulation Mode must continue to behave exactly as before.

## Browser-state isolation

Primary rule: do not add actor namespaces to normal AsolDB keys unless a concrete browser primitive is proven to ignore port boundaries. The port/origin itself is the namespace.

Verify empirically that each actor origin has an independent copy of:

- IndexedDB and `AsolDB` stores, including AUTH, QUERY_CACHE, CART, FAVORITES, PAGE_SNAPSHOTS, PAGE_SAVE_PENDING/JOURNAL, onboarding, notification stores, image-upload drafts, and APP_SETTINGS.
- TanStack Query persisted cache and in-memory QueryClient after hard navigation.
- localStorage and sessionStorage.
- Cache Storage and Service Worker registrations/scopes.
- Web Push subscriptions.
- BroadcastChannel traffic.
- Zustand persistence and any direct browser storage call sites.

Audit cookies separately because cookie scoping does not use the port as an isolation boundary. No account identity/session secret may depend on a shared cookie that would cross these origins.
## Route and state restoration

- Before leaving an actor origin, record its exact pathname, query, and hash in that origin's own development control storage.
- Exclude unsafe/auth/bootstrap/dev-control routes from resume targets.
- Returning to an actor button opens that actor's fixed origin at its last safe route; on first activation use a role-appropriate default.
- Because the browser origin is stable, all durable per-user state remains where it was left without copying data between actors.
- Cross-origin switching must use full navigation, not SPA router replacement, so React/module singletons, event listeners, mutation queues, and in-memory caches cannot leak between actors.
- The actor toolbar must remain visible after the destination origin reloads whenever Simulation Mode is globally enabled for local development.

## Real notification model

- Keep the existing real notification business/event pipeline, Turso notification database, grant generation, preferences, templates, and delivery rules authoritative.
- Each actor origin registers its own Service Worker and Web Push subscription where browser support permits, making the subscription token distinct per actor.
- Register each origin's real Web Push token to that actor's real UID using the normal notification token API.
- Never multiplex one PushSubscription among several users.
- Notification-center records remain stored by the existing UID-aware repository in the receiving actor origin.
- Verify Buyer -> Seller, Seller -> Buyer, and delivery/provider notification paths through real business events, not a dev-only fabricated notification generator.
- Inactive origins may receive Web Push through their own Service Worker. When reopened, the addressed actor must see its accumulated unread notification state.
- If browser platform restrictions make a specific background delivery impossible, any development fallback may replace only transport, never business event creation, recipient selection, Turso preferences, or notification entity validation.
- Production/native notification behavior must remain untouched.

## ADB / device development

- When Android testing is needed, expose the actor ports individually with ADB reverse (`3002` through `3011`) while preserving the existing no-Wi-Fi/hotspot workflow.
- Do not require all ten ports to be reversed for ordinary single-actor testing; provide a deterministic helper that can bind the full fleet when simulation is requested.
- Verify that switching origins on the Android browser/app shell does not collapse storage into a shared non-origin-specific native store.
## Local Claude assistant usage

Claude local may be used as a secondary implementation/review agent for repository analysis, code review, test-gap discovery, or parallel inspection when useful.

Rules:

- Give Claude bounded tasks with explicit file/area ownership to avoid conflicting edits.
- It must follow `docs/06-super-admin-and-operations/agent-development-tooling.md`, repository architecture rules, and the same Mode-C/Desktop execution constraints.
- Prefer Claude for independent review or isolated subproblems rather than simultaneous edits to the same files.
- All Claude-produced changes must be inspected with Git diff and verified by the same project tests, type checks, static analysis, and Playwright evidence. Its output is not a completion certificate.
- Never provide plaintext `SIM_*_PASSWORD` values in prompts/logs when a task does not strictly require them.

## Implementation sequence

1. Preserve pre-existing unrelated changes and record the starting Git status.
2. Build tests/contract checks for fixed port-to-actor mapping and strict development guard.
3. Implement the single-runtime multi-origin gateway/proxy with HMR/RSC/API/static/SW forwarding.
4. Implement the fixed actor registry without client-side plaintext credentials.
5. Implement the dev-only real-session bootstrap for each port/actor and Super Admin.
6. Add the Super Admin development-area Simulation Mode switch, default OFF.
7. Implement globally persisted development simulation enablement without putting it in user Turso state.
8. Implement the fixed top actor toolbar and active-actor indication.
9. Implement per-origin safe route checkpoint/resume and full-origin navigation.
10. Verify browser-origin isolation before adding any custom namespacing code; remove/avoid unnecessary storage-scope machinery.
11. Audit cookies and any non-origin-isolated native/client persistence and isolate only concrete exceptions.
12. Validate Service Worker/Web Push registration separately on every actor origin and fix only transport-specific gaps.
13. Verify real cross-actor order/service notifications and unread-state persistence.
14. Add ADB reverse helper/support for the fixed actor ports when device simulation is used.
15. Run targeted tests, TypeScript, architecture checks, ESLint/Semgrep/Biome as applicable, plus `rg`/AST review of persistence and auth boundaries.
16. Run Playwright against multiple actor origins concurrently and verify route/state restoration and isolation.
17. Update simulation-user and development-tooling documentation plus any generated indexes required by repository rules.
18. Re-read this plan and perform the final point-by-point acceptance audit.
## Twelve-point acceptance checklist

1. Super Admin development tooling contains a Simulation Mode switch and its fresh/default state is OFF.
2. With the switch OFF, the actor toolbar is absent and the project returns to the ordinary development UI/behavior with the normal developer tooling available.
3. With the switch ON, a persistent fixed top toolbar shows the nine registered simulation actors plus Super Admin and highlights the active actor.
4. Each actor uses a dedicated fixed origin/port and a real signed session for its actual Turso UID/profile/permissions.
5. Multiple actors can run concurrently in different tabs/windows, and sequential switching never overwrites another actor's browser-local state.
6. Returning to an actor restores its previous safe route and durable state rather than creating a fresh browser identity.
7. The top toolbar remains visible across all application routes while Simulation Mode is active and disappears immediately when the mode is disabled.
8. Business mutations use the ordinary production-equivalent APIs and real Turso shards. Simulation contains no fake orders, fake services, or mock account data.
9. Notifications generated by real business flows reach only the addressed actor, through that actor's own origin/token where supported, and remain available when the actor returns.
10. IndexedDB/AsolDB, Query Cache, cart, favorites, page snapshots/save journals, onboarding/drafts, settings, localStorage, sessionStorage, Cache Storage, Service Worker state, Web Push, and BroadcastChannel are proven not to cross-contaminate actor origins.
11. Super Admin retains genuine Super Admin authorization, its own fixed origin, previous route/state restoration, and the ability to control Simulation Mode.
12. Production behavior/bundles expose neither the simulation control plane nor simulation credentials, and disabling Simulation Mode restores normal development without deleting actor data.

## Required verification evidence

- Starting and final `git status` plus reviewed `git diff` for every touched file.
- Automated tests for port-to-actor mapping, dev guard, session bootstrap, switch default/OFF behavior, route resume, and production exclusion.
- Browser proof that the same AsolDB key can hold different values on two actor origins without collision.
- Browser proof that cart, Query Cache, localStorage/sessionStorage, BroadcastChannel, Service Worker registrations, and PushSubscriptions are distinct between at least Buyer 01 and Seller 01.
- Real signed-login evidence for buyer, seller, provider, and Super Admin without exposing tokens/passwords.
- Playwright evidence for Buyer 01 -> Seller 01 -> Buyer 01 restoration and two concurrently open actors.
- Real end-to-end notification evidence created by a business action, including sender actor, target UID, notification Turso routing/token state, and receiving actor unread center state.
- Verification that Simulation OFF removes the toolbar and returns to canonical normal development behavior.
- Applicable typecheck, architecture checks, targeted tests, lint/static analysis, and browser console/network inspection.
- Final re-read of this plan with every acceptance item marked PASS or a clearly documented blocking defect before declaring completion.
## Final implementation audit — 2026-09-12

Status: **12/12 PASS**. Live Simulation Mode is implemented and verified on the Desktop development environment.

1. **PASS — Super Admin switch / default OFF.** `ASOL DEV` exposes the Simulation Mode switch only to the real Super Admin. Launcher startup and shutdown reset runtime state to OFF.
2. **PASS — ordinary OFF behavior.** Browser proof showed disabling from the Super Admin actor returned to `127.0.0.1:3001`, removed the actor toolbar, and restored ordinary `ASOL DEV` chrome.
3. **PASS — ten-actor toolbar.** ON renders Buyer 01–03, Seller 01–03, Provider 01–03, and Super Admin with active-actor state from root composition.
4. **PASS — fixed origins and real identities.** Actor ports are 3002–3011; the internal backend is 3199. Buyer, Seller, Provider, and Super Admin were each verified with real signed sessions and their expected Turso identities.
5. **PASS — concurrent isolation.** Buyer 01 and Seller 01 ran in concurrent browser tabs with separate local state; same probe keys did not cross origins.
6. **PASS — route/state restoration.** Buyer 01 was checkpointed on `/cart`, switched to Seller 01, and returned to Buyer 01 on `/cart` with its durable origin state intact.
7. **PASS — persistent toolbar / clean disable.** The toolbar survives application route changes while ON. Ordinary developer chrome is hidden while an actor is active and reappears immediately after OFF.
8. **PASS — production-equivalent mutations.** Simulation sessions use the ordinary auth service and business APIs against the real Turso/cloud data plane; no fake order/service/account data path was introduced.
9. **PASS — addressed real notifications.** Buyer 01 sent a real specialty request; notification service calls returned 200. Seller 01 received exactly one incoming matching notification in its own AsolDB, while Buyer 01 retained only its outgoing copy.
10. **PASS — browser-state isolation.** Buyer/Seller checks proved separation for AUTH/AsolDB, cart, query cache, localStorage, sessionStorage, Cache Storage, Service Worker/PushSubscription, and BroadcastChannel. Cookie audit found no actor identity/session cookie dependency.
11. **PASS — genuine Super Admin.** Port 3011 bootstrapped the canonical Super Admin signed session, retained Super Admin authorization, restored its actor state, and controlled OFF from the top toolbar.
12. **PASS — development-only and reversible.** All simulation API routes use strict development guards. Next/gateways bind to loopback only, actor bootstrap requires the private per-run proxy secret and same-origin POST validation, direct 3199 actor spoofing returns 403, and OFF preserves actor storage while returning normal development.

### Final verification evidence

- `npm run test:simulation-core` — PASS.
- `npm run test:simulation-contract` — PASS.
- `npm run dev:simulation:smoke` — PASS, including direct-backend rejection, cross-origin rejection, same-origin real bootstrap, ten actor health probes, and OFF redirect.
- Forced `SIGKILL` recovery — PASS: the launcher was killed while Next remained on 3199; the next smoke run removed the orphan automatically, completed successfully, and left no runtime metadata/listener behind.
- `npm run lint` — PASS.
- `npm run dom:id:check` — PASS, 3045 static identities and 2 runtime IDs.
- `npm run typecheck` — PASS.
- `npm run architecture:check` — PASS with Architecture Score 100%.
- `npm run test:notifications` — PASS, including 61 integration scenarios plus token cardinality, Web Push, grants, locale routing, specialty-chat signatures, mobile push, and account-surface contracts.
- Real Web Push — PASS in persistent Chrome: Buyer 01 and Seller 01 each registered a Service Worker and distinct PushSubscription; both device-token registrations returned 200.
- ADB — PASS: `npm run dev:simulation:adb` installed reverse mappings for 3001–3011 on the connected Android device; `dev:simulation:adb:remove` is the deterministic cleanup command.
- Independent Claude review — final security review passed loopback binding, proxy-secret trust boundary, CSRF/origin validation, orphan recovery, production exclusion, actor/session isolation, ADB, and touch policy. Its final UI observation about `ASOL DEV` visibility was fixed and covered by `test:simulation-contract` plus the final lint/type/architecture gates.
- `git diff --check` — PASS.
- Final runtime state — OFF; no simulation runtime metadata file and no stale 3001/3199 listener remained after smoke/recovery verification.

No plaintext simulation password, session token, PushSubscription endpoint, or proxy secret was added to tracked documentation or client code.
