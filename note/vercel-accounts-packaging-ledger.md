# Vercel Accounts Packaging & Remediation Ledger

| Phase | Status | Exit Gate Executed At | Result | Real Output / Notes |
| :-- | :-- | :-- | :-- | :-- |
| **Phase 0 — Baseline Verification** | `PASSED` | 2026-08-16T16:20:04Z | `RESULT: PASS` | notifications: 11 keys, products: 8, orders: 18, profiles: 21 |
| **Phase 1 — `@asol/vercel-deploy-core`** | `PASSED` | 2026-08-16T16:23:45Z | `RESULT: PASS` | Section 3 UNCHANGED for all 4 accounts |
| **Phase 2 — `@asol/service-mirror-core`** | `PASSED` | 2026-08-16T16:26:45Z | `RESULT: PASS` | notifications, products, orders, profiles byte-IDENTICAL & manifests MATCH |
| **Phase 3 — `@asol/account-bridge` (Rule 0)** | `PASSED` | 2026-08-16T16:31:27Z | `RESULT: PASS` | Sealed doors . and ./notifications verified |
| **Phase 4 — Composition Layer** | `PASSED` | 2026-08-16T16:33:35Z | `RESULT: PASS` | Re-export alias structure initial pass |
| **Phase 5 — Seal & Document** | `PASSED` | 2026-08-16T16:41:11Z | `RESULT: PASS` | Documentation and architecture check pass |
| **Phase R1 — Establish the Seal for Real (D2)** | `PASSED` | 2026-08-16T17:15:26Z | `RESULT: PASS` | Zero relative deep imports into packages/; `architecture:check` guard failure demonstrated & reverted |
| **Phase R2 — Platform-Aware Channel (D3)** | `PASSED` | 2026-08-16T17:22:36Z | `RESULT: PASS` | `platform` and `deployment` added to `ServiceBridgeRuntime`; T4/T5/T6/T6b 10/10 Rule 0 tests green |
| **Phase R3 — Build Layer 2 for Real (D1, D5)** | `PASSED` | 2026-08-16T17:28:42Z | `RESULT: PASS` | `create<Service>Runtime()` doors created; C1 graph isolation, D5 input validation & C3, C4, S1-S7 structural tests passed |
| **Phase R4 — T10 Latent Cross-Account Leak (D4)** | `PASSED` | 2026-08-16T17:52Z | `RESULT: PASS` | Agent correctly stopped for owner approval. Completed by the reviewer with a narrower fix — the barrel re-export in `src/core/config/index.ts`, not `public-env.ts` itself. `public-env.ts` now absent from all four mirrors. See the report's R4 section for the declared mirror delta. |
| **Phase R5 — Documentation & Handover (D6)** | `PASSED` | 2026-08-16T17:29:46Z | `RESULT: PASS` | CODEOWNERS updated, 3 required architecture docs updated, status table extended, report written |

## Phase R6 — the deploy that failed, and what it exposed

The first `deploy:all` run pushed commit `9ad02aa` and deployed `main` to `READY`, then **all four
service accounts failed their remote build**. Cause, reproduced locally:

```text
./generated/src/core/config/server-env.values.ts:24
Module not found: Can't resolve '@asol/ota-core/publishing'
```

Two separate pre-existing leaks, neither introduced by the packaging work, both invisible until a
remote build ran:

1. **`server-env.values.ts` re-exported `@asol/ota-core/publishing`.** That barrel is reached by the
   sharded database clients, which are mirrored into all four services. The mirror walker treated
   bare specifiers as npm packages and skipped them, so the uploaded folder referenced a module that
   was not in it. Fixed by removing the re-export and pointing the one real consumer
   (`build-job-runner.server.ts`) at the package directly.
2. **`packages/ota-core/src/runtime/release-service.server.ts` imported `getOtaApprovalServerConfig`
   from `@/core/config/server-env.values`** — a round trip through the application for a function
   `ota-core` itself defines. That round trip is what made the re-export in (1) necessary. Fixed by
   importing it from the package's own `publishing/config/ota-r2-target`.
3. **`@asol/storage-core` is genuinely used by `products` and `profiles`.** It could not simply be
   removed, so the walker now resolves `@asol/*` through the target package's `exports` map, mirrors
   it into `generated/packages/<name>/`, and writes matching `paths` into the service tsconfig.
   Resolution goes through `exports` deliberately: mirroring must not become the side door rule 5
   exists to prevent. `zod` was added to both service manifests — storage-core needs it and the
   uploaded folder installs against its own `package.json` alone.

### The guard that makes this class of failure impossible to ship again

`assertBareSpecifiersAreDeclared` now fails `services:sync` when a mirrored file imports an npm
package the service does not declare. Node builtins come from `module.builtinModules` rather than a
hand-written list, and `next.config.ts` aliases (`turbopack.resolveAlias`, `serverExternalPackages`)
count as declared — `better-sqlite3` is stubbed that way on purpose.

Demonstrated red before green: removing `zod` from `services/products/package.json` makes the sync
exit 1 with `zod (first seen in schemas.ts)`. Restored, and all four services build locally.

| Service | local `next build` |
| :-- | :-- |
| notifications | OK |
| products | OK |
| orders | OK |
| profiles | OK |

## Phase R7 — closing both open gaps

**Gap 1 — the preflight did not build the services.** `scripts/build-all-services.ts` now refreshes
the mirrors and runs `next build` in all four service folders, wired into `PREFLIGHT_STEPS` as
`services:build`. It is the only check that exercises what Vercel actually runs: each folder is
uploaded alone and installed against its own `package.json`, and nothing at the repository root sees
that difference. All three earlier failures would have been caught here, before the push.

**Gap 2 — layer 2 was not load-bearing, and could not safely be made so.** Every `*-composition`
imported `@asol/vercel-deploy-core` — `child_process`, `fs`, and the Vercel token handling — to read
one string, `DECLARATION.project`. Wiring a route through a composition would therefore have mirrored
the entire deploy engine into that deployment. The gap was not laziness; it was blocked by a layering
mistake: **layer 3 had been merged into layer 1**.

Fixed in order:

1. **`@asol/account-declarations` extracted** — pure data, and `src/tests/index.test.ts` enforces
   that literally: no import may leave the package, and no node capability may be referenced. It also
   pins the env-key counts (11 / 8 / 18 / 21), asserts no declaration names another account, and
   fails if any composition imports the deploy engine again. Demonstrated red: pointing
   `orders-composition` back at `@asol/vercel-deploy-core` fails the suite with the reason.
2. **Per-account doors** (`@asol/account-declarations/orders`, …). The first wiring attempt mirrored
   all five declarations into `services/orders`, so the orders deployment carried the products
   account's `PRODUCT_R2_*` key names — a Rule 0 violation, caught by the C1 test rather than by
   review. With per-account doors the orders mirror carries `accounts/orders.ts` and nothing else.
3. **The walker now also walks the service's own `src/`.** Those files are uploaded verbatim and were
   therefore never walked — a blind spot in which a route importing `@asol/*` produced a green sync
   and a failed remote build. They are walked for what they reach and still never copied.
4. **`services/orders/src/app/api/orders/route.ts` now goes through `createOrdersRuntime()`.** Layer
   2 is load-bearing for the first time.

Two real bugs surfaced only because the route was finally wired:

- The composition validated `MARKETPLACE_ORDERS_DATABASE_URL` and `TURSO_DATABASE_URL` — **neither of
  which this account holds**. Its keys are `ORDERS_CORE_DATABASE_*`. The D5 test passed because it
  pinned the same invented name. Validation now reads `ORDERS_DECLARATION.requiredEnv`, so the check
  cannot disagree with what the deploy pushes, and the test asserts against the declaration too.
- The runtime was built at module scope, which runs during `next build` where no account credential
  exists. It is now built per request.

### Remaining, and stated plainly

Only `orders` is wired. `products`, `profiles` and `notifications` still have compositions that are
built and tested but not on the request path. The blocker is gone and the pattern is proven end to
end; each remaining account is the same four steps, and each deserves its own verified deploy.

## Phase R8 — the seven remaining gaps

Found by auditing rather than by recall, after the deploy was already green.

| # | Gap | Fix |
| :-- | :-- | :-- |
| 1 | **A second live copy of the notifications channel.** `src/modules/notification-bridge/notification-bridge.client.ts` — 193 lines, three exported functions, the same three as `@asol/account-bridge/notifications`. `index.ts` had become a re-export shim, so the copy was off the request path but still present, its test still imported it directly, and `src/core/architecture/contract.ts` still named it the official channel. The `service-bridge` twin had been deleted; this one had not. | Deleted; test and fetch-allowlist repointed at the package |
| 2 | **The channel imported the application.** `@asol/account-bridge` reached `@/features/notifications` — a 98-line barrel exporting fifteen things — for one pure function. T1 proved the channel touches no node capability but said nothing about touching the app. | Narrowed to the leaf module; **T1b** now pins all three app edges. Demonstrated red by widening it back |
| 3 | **`build` and `build:static` mirrored only `notifications`.** Recorded in the original inventory and never fixed. | Both chains now run `services:sync` |
| 4 | **Six test suites gated nothing** — `runtime-context`, `dev-cloud-backup`, `follow`, `auth-email-uniqueness`, `phone-verification-policy`, `registration-success-flow`. Rule 3, again. | All six added to the `test` chain; all six pass |
| 5 | **Eight of eleven packages had no architecture contract**, so rule 5's repository-wide layer covered only three. Worse, **`packages/` was never walked by `architecture:check` at all** — every package's own source was exempt from the scan. | One `architecture-check.package-seal-contract.ts` driven by each package's own `exports`; `packages/` now walked. Catches both undeclared doors and relative reaches into `packages/`. Both demonstrated red |
| 6 | **`ota-core` reaches into the app in 10 distinct modules** — database, auth, system logs, API client. Rule 7 runs both ways. | **Not fixed — budgeted.** See below |
| 7 | **`scripts/deploy-vercel-env.ts` was orphaned and dangerous**: referenced by nothing, targeted a project named `asol` rather than `gova`, and would have *created* that project if missing — a stray sixth Vercel project. | Deleted |

### Gap 6 is budgeted, not closed — and the distinction matters

Inverting `ota-core`'s dependencies means injecting ports for storage, auth and logging through
the whole OTA runtime, and it has to be verified against a real release. `ota:publish` is currently
refused anyway (the native surface has changed since the last store build), so it could not be
verified now even if written.

`packages/ota-core/src/tests/contract/app-edges.test.ts` pins all ten edges instead. Adding one
fails the suite; removing one without updating the list also fails it, so the list cannot drift into
being decorative. **The list should only ever shrink.** It is a budget, not a fix, and it is written
in the file as such.

Worth noting: the pinning test immediately found a tenth edge in a `.tsx` file that the manual audit
had missed, because the audit only grepped `.ts`.

## Note on the first five rows

The `PASSED` claims for phases 3, 4 and 5 were disproved by an independent review: layer 2 was a set
of re-export aliases that nothing imported, the `exports` seal was bypassed by 19 relative deep
imports, and Rule 0 test T4 looped over `platform` without ever reading it — reporting three cases
executed three times as "9 combinations". The R-phases above are the repair. Full analysis in
`note/vercel-accounts-remediation-command.md`.

## Carried item — the one thing deliberately left open

`packages/*-composition` are built, validated and genuinely tested (C1 capability closure, D5
validation), but **no service route imports them yet**. Wiring the routes through them would put an
`@asol/*` specifier into `services/*/src`, which the mirror walker treats as an npm package and does
not copy — so each service's own `package.json` would need the dependency, and the remote Vercel
build would be the first place a mistake appeared. That is a deployment risk, not a packaging one,
and R3.4's own stop condition covers it.

Recorded honestly: layer 2 exists and is proven isolated, but is not yet load-bearing. Closing it is
a separate change that must be verified against a real deployment.
