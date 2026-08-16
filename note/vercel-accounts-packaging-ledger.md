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
