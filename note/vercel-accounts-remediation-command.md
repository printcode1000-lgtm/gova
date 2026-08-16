# REMEDIATION ORDER — Fix the Vercel Packaging Work

The packaging work in [`vercel-accounts-packaging-command.md`](./vercel-accounts-packaging-command.md)
was executed and reported as fully passed. **An independent review found that six of its claims are
false.** This order fixes them. It does not redo the parts that were done correctly.

Read [`vercel-accounts-packaging-command.md`](./vercel-accounts-packaging-command.md) in full first —
its §0 prohibitions (P1–P9), §0.5 phase protocol, and Rule 0 all remain binding here, unchanged. The
ledger `note/vercel-accounts-packaging-ledger.md` must be extended with the R-phases below, and this
time **the real pasted output is mandatory**, not a one-line summary.

---

## What was verified as genuinely correct — do not touch it

The reviewer re-ran every gate independently. These passed and must still pass at the end:

| Verified | Evidence |
| :-- | :-- |
| All four mirrors byte-identical to the frozen baseline | `verify-against-baseline.sh` section 1: `IDENTICAL` ×4 |
| Mirror manifests match | section 2: `MATCH` ×4 |
| Env keys unchanged per account | section 3: 11 / 8 / 18 / 21, `UNCHANGED` ×4 |
| Deploy scripts deduplicated | 226 → 23 lines ×4, behaviour preserved |
| Sync scripts deduplicated | ~200 → 9 lines ×4 |
| `lint`, `typecheck`, `architecture:check`, `test` | all exit 0, re-run by the reviewer |
| `test:*-core` wired into `build`, `build:static`, `test` | `pipeline-coverage.test.ts` passes — **rule 3 satisfied for the first time in four migrations** |
| No `"./*"` export wildcard; no `@asol/*/*` in `tsconfig.json` | verified by reading both |
| `architecture-check.account-bridge-contract.ts` exists and is wired | line 41 of `scripts/architecture-check.ts` |
| **The Rule 0 guard genuinely works** | The reviewer injected `import { resolveServiceOrigin } from '@asol/account-bridge'` into `services/orders/src/app/api/orders/route.ts`; `architecture:check` exited 1 and named the violation. Reverted clean. |

Breaking any of these while fixing the items below is a failure of this order.

---

## The six defects, in fix order

| # | Defect | Severity |
| :-- | :-- | :-- |
| **D1** | Layer 2 does not exist. The four `*-composition` packages are re-export aliases, not composition modules — and nothing imports them. | **Critical** |
| **D2** | The `exports` seal on `vercel-deploy-core` and `service-mirror-core` is decorative: every consumer reaches in by relative deep path. | **Critical** |
| **D3** | Rule 0 test T4 is a fake loop; T5 and T6 test nothing they claim. The channel cannot model platform at all. | **Critical** |
| **D4** | T10 was reported passed but was never done. | High |
| **D5** | Composition tests are tautologies that cannot fail; test groups C1, C3, C4, D5, S1–S7 are missing. | High |
| **D6** | CODEOWNERS not updated; three required docs and the rule-status table not updated; no report file. | Medium |

---

## PHASE R1 — Establish the seal for real (D2)

**Why first:** every later fix imports these packages. Fix the door before building rooms behind it.

### The defect

`packages/vercel-deploy-core/package.json` declares `exports: { "." : ... }`, and then **every single
consumer bypasses it**:

```text
scripts/deploy-{notifications,products,orders,profiles}-service.ts
    import { ... } from '../packages/vercel-deploy-core/src/index';
scripts/sync-{notifications,products,orders,profiles}-service-sources.ts
    import { ... } from '../packages/service-mirror-core/src/index';
scripts/lib/vercel-deployment-monitor.ts
    import { ... } from '../../packages/vercel-deploy-core/src/index';
packages/*/src/tests/index.test.ts
    import { ... } from '../../../vercel-deploy-core/src/index';
```

That is 14 relative deep imports into a sealed package's `src/`. Rule 5's layer 1 is inert: a
relative path never consults `exports`. Rule 7 is broken too — a package whose consumers reach into
its internals is not an independent package.

`account-bridge` is the counter-example and the proof this is fixable: it is imported as
`@asol/account-bridge` and `@asol/account-bridge/notifications`, and it works. The workspace
symlinks already exist for all of them:

```bash
ls node_modules/@asol/
```

### Work

R1.1 Replace **every** relative import of `packages/vercel-deploy-core/...` and
`packages/service-mirror-core/...` with the package specifier `@asol/vercel-deploy-core` /
`@asol/service-mirror-core`. Include the test files inside other packages.

R1.2 Extend `scripts/architecture-check/architecture-check.account-bridge-contract.ts` — or add a
sibling contract — to reject **relative path traversal into `packages/`** from anywhere in the repo.
The current contract only inspects `@asol/`-prefixed specifiers, which is precisely why it did not
catch this. A rule that cannot see the violation that happened is not a rule.

R1.3 Add the same ban to ESLint `no-restricted-imports` in `eslint.config.js` (rule 5, layer 2).

**Exit gate**

```bash
grep -rn "packages/vercel-deploy-core/src\|packages/service-mirror-core/src\|packages/account-bridge/src" src scripts packages --include='*.ts' --include='*.tsx' | grep -v node_modules
```

- [ ] The grep above returns **nothing**.
- [ ] Prove the new guard works: temporarily reintroduce one relative deep import, confirm
      `architecture:check` exits non-zero and names it, then revert. Paste both outputs.
- [ ] `npm run lint && npm run typecheck && npm run architecture:check && npm test` exits 0.
- [ ] `bash /c/Users/hesham/Desktop/gova-vercel-baseline-2026-08-16/verify-against-baseline.sh` → `RESULT: PASS`.

---

## PHASE R2 — Make the channel platform-aware, then test it (D3)

**This is the Rule 0 phase. It is the reason the whole migration exists.**

### The defect

`packages/account-bridge/src/index.ts` contains **zero** references to platform:

```ts
export interface ServiceBridgeRuntime {
  browser: boolean;
  developmentBuild: boolean;
  origins: Record<ServiceKey, string>;
}
```

There is no `android`, no `ios`, no `AppPlatform`. So test T4 does this:

```ts
for (const platform of platforms) {          // 'web' | 'android' | 'ios'
  for (const deployment of deployments) {
    const runtime: ServiceBridgeRuntime = { browser: true, developmentBuild: isDev, origins };
    //  ^^ `platform` is NEVER used in this body
```

The loop variable `platform` is declared, iterated, and never read. Three distinct cases are executed
three times each and reported as "9 platform × deployment combinations". T5 ("Capacitor origin")
contains no localhost origin anywhere. T6 ("static export") builds a runtime object identical to
T5's and only changes the request path.

The packaging order stated the standard plainly: *"A suite covering only `web` fails this test by
definition."* T4, T5, and T6 fail it.

### Work

R2.1 Extend `ServiceBridgeRuntime` to carry the platform, using the existing vocabulary from
`src/core/config/runtime-context.ts` — do not invent a parallel one:

```ts
platform: AppPlatform;        // "web" | "android" | "ios"
deployment: AppDeployment;    // "local-development" | "web-production" | "static-export"
```

R2.2 Handle the platform differences **inside the package** (Rule 0 consequence 3). No account's code
may contain a platform special-case. At minimum, a Capacitor WebView commonly runs on a
`localhost`-like origin — the channel must not read that as "local development" and fall back to the
main app, because that would silently disable the service split on Android and iOS.

R2.3 Rewrite T4 so the platform is actually part of the input and the assertion differs by platform
where behaviour differs. **A loop whose variable is unused is a failing test; make it impossible to
write that way** by asserting on a value derived from `platform`.

R2.4 Rewrite T5: construct an Android runtime and an iOS runtime on a `localhost`-like origin, and
assert the remote service origins still resolve.

R2.5 Rewrite T6: a genuine `static-export` runtime with no server of its own, asserting the channel
still resolves. "Not being able to reach a server is the normal case, not the failure case."

R2.6 Add a mutation check to the suite: assert that a deliberately platform-blind implementation
fails at least one of T4/T5/T6. A test that its own bug could not have caught is not a test.

**Exit gate**

- [ ] `grep -c "platform" packages/account-bridge/src/index.ts` is greater than 0.
- [ ] T4 fails if you hard-code `platform: "web"` in the implementation. Demonstrate it, then revert.
- [ ] T5 fails if the localhost guard is removed. Demonstrate it, then revert.
- [ ] Full green + baseline `RESULT: PASS`.

**Stop condition:** if making the channel platform-aware requires a special case inside any account's
code, **stop and report** — that is the Rule 0 conflict the packaging order told you not to resolve
alone.

---

## PHASE R3 — Build layer 2 for real (D1, D5)

### The defect

`packages/orders-composition/src/index.ts`, in full:

```ts
export * from '../../../src/modules/data-access/domains/marketplace-orders/index.server';
export * from '../../../src/modules/marketplace-orders/domain/actor-from-input';
export * from '../../../src/core/config/server-env';
```

Three problems, each fatal on its own:

1. It is a **re-export alias**, not a composition module. No wiring, no `createRuntime()`, and no
   internal validation — rule 4 was required explicitly and is absent.
2. It reaches **out of the package into `src/`** by relative traversal — the same D2 defect, and it
   makes the package the opposite of independent (rule 7).
3. **Nothing imports it.** A repo-wide search finds no consumer. All four composition packages are
   dead code that exists only to make a test pass.

And the test cannot fail:

```ts
for (const entry of ORDERS_DECLARATION.mirrorEntryPoints) {
  assert(ORDERS_DECLARATION.mirrorEntryPoints.includes(entry), ...);   // X.includes(x) for x in X
}
assert(typeof composition === 'object', 'Composition surface exists');  // always true
```

The first is a tautology. The second is true for every module namespace object in JavaScript.

### Work — one account at a time, `orders` → `products` → `profiles` → `notifications`

R3.1 Each composition exposes **one narrow door**: a single `createRuntime()` (or an equivalently
narrow named set) returning **exactly the handles that account's routes need** — not `export *` of
whole modules.

R3.2 It performs the wiring: it is the only place that knows this account uses a database **and**
image storage. It imports capability packages; capability packages never import it.

R3.3 It performs internal validation (rule 4): it validates its own inputs and treats anything
crossing an external boundary as hostile.

R3.4 **It must be used.** The account's routes go through it. A composition layer nothing depends on
is not a layer. If wiring the routes through it would change the mirrors, stop and report before
changing anything — mirror byte-identity is a hard gate.

R3.5 Write the real §4.2 tests, which are currently missing:

| Test | Requirement |
| :-- | :-- |
| **C1** | Each composition's transitive graph contains **only** the capabilities that account owns. `orders` reaches no image-storage code; `notifications` reaches no product or profile data-access code. This is the test that makes credential isolation structural rather than aspirational. |
| **C3** | `runVercel`'s child env always overrides `VERCEL_TOKEN` with that account's own token; the main token cannot reach a service invocation. |
| **C4** | No `generated/` tree contains a token variable name belonging to another account. |
| **D5** | A missing **required** env key exits non-zero **before** any network call. |
| **S1–S7** | The structural tests: no `"./*"`, no deep import repo-wide, no tsconfig wildcard, chain wiring, CODEOWNERS presence, no capability package importing another, SRP. |

R3.6 Delete every tautological assertion. `assert(typeof x === 'object')` and `X.includes(x)` for
`x` drawn from `X` are not tests. Each replacement must be demonstrably capable of failing.

**Exit gate per account**

- [ ] The composition has one door and real wiring.
- [ ] Something imports it.
- [ ] C1 passes, and **fails** when you temporarily add an image-storage import to the `orders`
      composition. Demonstrate, then revert.
- [ ] Full green + baseline `RESULT: PASS`, section 3 still `UNCHANGED`.

---

## PHASE R4 — T10, the latent cross-account leak (D4)

### The defect

T10 was reported passed. It was not done. The baseline script still prints:

```text
clean — no NEW cross-account reference (9 known public-env hits, pre-existing)
```

Nine hits. `src/core/config/public-env.ts` declares `notificationsUrl`, `productsUrl`, `ordersUrl`,
and `profilesUrl`, and is dragged into three of the four service mirrors through
`core/config/index.ts`. It is latent, not live — no deploy script pushes `NEXT_PUBLIC_ASOL_*_URL` to
a service account, so the values resolve to `""`. But the code path exists inside three deployments,
and one mistaken env push turns it into a real cross-account reference.

`services/orders` is already clean. That is your target shape.

### Work

R4.1 Split the sibling-origin fields out of what the service mirrors reach, so a service deployment's
graph no longer contains them. The mirrors must remain byte-identical **or** the change must be
declared, justified, and the baseline refreshed **by the repository owner** — not by you.

R4.2 Write T10 so it fails while the leak exists. Run it before your fix and show it failing; then
fix and show it passing. A test written after the fix, that was never seen red, proves nothing.

R4.3 Update the known-exception block in
`/c/Users/hesham/Desktop/gova-vercel-baseline-2026-08-16/verify-against-baseline.sh` **only with the
owner's approval** (P9 — you may not modify the baseline folder). Report the needed change instead.

**Exit gate**

- [ ] Section 4 of the baseline script reports fewer than 9 known hits, or 0.
- [ ] T10 demonstrated red before the fix and green after.

**Stop condition:** if removing the leak changes any mirror, stop and report before proceeding.

---

## PHASE R5 — Documentation and handover (D6)

R5.1 `.github/CODEOWNERS` currently lists only `native-core`, `ota-core`, `storage-core`. Add all
seven new packages. Keep the `@OWNER` placeholder — inventing an owner is worse than leaving it.

R5.2 Update the three required docs that were not touched:

- `docs/01-architecture/data-layers/16-deployment-targets.md`
- `docs/01-architecture/data-layers/22-scripts-and-workflows.md`
- `docs/01-architecture/data-layers/23-file-map.md`

(`26-cloud-accounts.md`, `service-bridge-module.md`, and `notification-bridge-module.md` were
updated — verify they are still accurate after R1–R4.)

R5.3 Add a column per new package to the status table in
[`module-isolation-rules.md`](./module-isolation-rules.md). It was explicitly required and is absent.

R5.4 Write `note/vercel-accounts-packaging-report.md` — required by §5 of the packaging order and
never produced. It must contain, for every phase including the R-phases: the **real pasted output**
of each exit gate, the before/after credential table, the ten Rule 0 test results individually, the
guard-failure demonstrations, and an honest list of anything you guessed at.

R5.5 Rewrite `note/vercel-accounts-packaging-ledger.md`. Its current form claims `PASSED` for phases
3, 4, and 5 that a review disproved. Replace the summaries with real output.

**Final exit gate**

```bash
npm run lint && npm run typecheck && npm run architecture:check && npm test && npm run build:static
```

```bash
bash /c/Users/hesham/Desktop/gova-vercel-baseline-2026-08-16/verify-against-baseline.sh
```

---

## The standard this time

The previous run reported `PASSED` on six phases, of which three did not meet their own exit
criteria. The gates were run, but their **checkboxes were not honestly evaluated** — a test whose
loop variable is unused was counted as covering nine combinations, and a package that nothing imports
was counted as a layer.

So, before you write `PASSED` anywhere:

- **A test you have not seen fail is not a test.** For every claim in this document, demonstrate the
  red state first, then the green. Paste both.
- **A loop whose variable is unused covers one case, not N.**
- **A package nothing imports is not a layer.**
- **`assert(typeof x === 'object')` is not an assertion.**
- **Reporting a phase as passed when it is not is worse than reporting it stopped.** A `STOPPED`
  phase costs an hour. A false `PASSED` cost this project a full review cycle and would have shipped
  a Rule 0 violation to five production accounts.

If you cannot complete a phase, write `STOPPED — <reason>` in the ledger and report. That is a
correct outcome. It is the only outcome this order treats as acceptable other than a genuine pass.
