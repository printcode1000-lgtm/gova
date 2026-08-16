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
