# The Eight Module Isolation Rules

The standing contract for every sealed package in this repository. Agreed before the
`@asol/native-core` migration and applied unchanged to `@asol/ota-core` and `@asol/storage-core`.

Any future consolidation is held to these eight. Quote them by number in migration specs rather than
restating them.

---

## 1. Core Module

One module holds the sensitive logic in full. The rest of the project never touches its files
directly.

## 2. A single public API

One entry point — a single `execute()` or a small set of explicitly named functions. All interaction
goes through it, with no side doors.

## 3. Mandatory Unit + Integration tests

Both layers are required, and **any change that breaks them must fail the build or CI**. A test that
exists but does not gate the release does not satisfy this rule (see §"Standing weaknesses").

## 4. Internal validation

The module validates its own inputs. It never assumes the rest of the project sends correct data, and
it treats anything crossing an external boundary as hostile.

## 5. No direct imports of internal files

Only `index.ts` / the declared public API is importable. Enforced mechanically, not by convention.

## 6. Branch Protection

Branch protection configured so `main` cannot be rewritten, and so no change lands without the
release checks passing.

**Amended 2026-08-17: the CODEOWNERS half was removed.** The rule originally read
"CODEOWNERS + Branch Protection" and required review from code owners on any pull request touching
`packages/**`. That half is not achievable here and never was:

- the repository has one developer, and GitHub refuses a review from the author of a pull request,
  so a required code-owner review would have blocked every pull request permanently;
- releases do not go through pull requests at all — `deploy:all` pushes directly to `main` — so the
  rule governed a path nothing uses.

A `.github/CODEOWNERS` file under those conditions declares ownership that nothing can act on, and
its guarding test was written as `if (existsSync(codeownersPath))`, so it would have reported green
while asserting nothing. Both were deleted rather than left as decoration.

What replaces it on a single-developer repository is the check that actually gates every change:
**a required status check**. That is the reviewer here, and unlike a human it cannot be skipped.

Restore the ownership half the day a second developer joins: recreate `.github/CODEOWNERS`, then add
`require_code_owner_reviews` and an approval count of 1 to `scripts/protect-main-branch.ts`.

## 7. An independent package inside the monorepo

`packages/<name>`. Other modules depend on it and know nothing of its internals — as if it were a
third-party library.

## 8. Single Responsibility Principle

Every file inside the module has exactly one reason to change and one clear job.

---

## Rule 9 (added during the `native-core` design discussion)

**Dependency-upgrade isolation.** Upgrading an external dependency — Capacitor and its plugins, the AWS
SDK, the Android Gradle Plugin, the iOS SPM deps — must require changes **only inside the module**, and
zero changes anywhere else. Every boundary is designed against this test.

**The cost this rule carries: tooling that discovers by reading the root `package.json`.** Capacitor
is one. Moving every plugin dependency into `native-core` means `npx cap sync` finds none of them, and
it does not warn — it regenerates `android/capacitor.settings.gradle` with zero `include` lines, so 25
registrations vanish and the failure surfaces much later as a Java compile error naming a plugin
package that "does not exist". The answer is `includePlugins` in `capacitor.config.ts`, an explicit
allowlist that overrides discovery, derived from `native-core`'s own dependencies so the module stays
the single source of truth. Before relocating a dependency under this rule, check whether any tool
resolves it by scanning the root manifest, and give that tool an explicit list.

---

## How the eight are enforced in practice

Rules 2, 5, and 7 are enforced by four independent layers, because any one of them alone is bypassable:

1. **`exports` in the package's `package.json`** — exactly the declared doors, never a `"./*"`
   wildcard. Deep imports fail at resolution time.
2. **ESLint `no-restricted-imports`** — bans deep paths and vendor dependencies outside the adapter
   layer.
3. **`packages/architecture-core/src/checks/package-seal-contract.ts`** — walks the whole
   repository during `architecture:check`, which runs inside `build` and `build:static`. It reads
   each package's own `exports` map, so it covers every package automatically rather than only the
   ones someone wrote a contract file for. It rejects two things: an import through an undeclared
   door, and **any relative path that reaches into `packages/`**.

   The second is the one that actually happened. Nineteen imports of the form
   `../packages/vercel-deploy-core/src/index` made the seal decorative while every declared door
   looked correct — a relative path never consults `exports`, so layers 1 and 2 above are both blind
   to it.

   Note also that `packages/` itself was not walked by `architecture:check` for a long time, which
   exempted every sealed package's own source from the scan that rule 5 leans on. It is walked now.
4. **Contract tests inside the package** — pin the exported surface and the module's own shape.

**The `tsconfig.json` caveat:** a `"@asol/<name>/*"` path wildcard silently defeats layer 1. It was
added once to `native-core` and made the `exports` seal non-functional until removed. Never reintroduce
it for any package.

---

## Current status

Forty-one sealed packages, arranged in four layers. The layering is not decoration — see
[The four layers](#the-four-layers).

Doors and app-edge counts below are measured, not intended. Re-measure with:

```bash
node -e "for(const p of require('fs').readdirSync('packages')) try{const m=require('./packages/'+p+'/package.json'); if(m.name?.startsWith('@asol/')) console.log(m.name, Object.keys(m.exports||{}).join(' '))}catch{}"
```

### Full inventory (41 packages)

The first consolidation wave is described in
[consolidation-2026-08.md](./consolidation-2026-08.md); the repository-wide follow-up that added
`data-health-core`, `backup-core` and the release-console doors is in
[capability-consolidation-2026-08-follow-up.md](./capability-consolidation-2026-08-follow-up.md).
The UI-adjacent follow-up that added `hero-slider-core`, `featured-marquee-core`,
`trending-ribbon-core`, and `page-snapshot-core` is in
[ui-capability-core-packages-2026-08.md](./ui-capability-core-packages-2026-08.md).
The application-side SRP split that separated large page/provider/test files
without introducing new sealed packages is recorded in
[srp-file-splits-2026-08.md](./srp-file-splits-2026-08.md).

| Package | Layer | Doors | `test:*-core` gate |
| :-- | :-- | :-- | :-- |
| `account-bridge` | 4 | `.` · `./notifications` | — |
| `account-declarations` | 3 | `.` · per-account | — |
| `orders-composition` | 2 | `.` | `test:compositions` |
| `products-composition` | 2 | `.` | `test:compositions` |
| `profiles-composition` | 2 | `.` | `test:compositions` |
| `notifications-composition` | 2 | `.` | `test:compositions` |
| `submain-composition` | 2 | `.` | `test:compositions` |
| `sub2main-composition` | 2 | `.` | `test:compositions` |
| `orders-core` | 1 | `.` | `test:orders-core` |
| `data-core` | 1 | `.` · `./telemetry` · `./core` · `./browser` · `./provisioning` · `./tooling` · per-domain (18) | `test:data-core` |
| `data-health-core` | 1 | `.` · `./server` | `test:data-health-core` |
| `backup-core` | 1 | `.` · `./server` | `test:backup-core` |
| `branding-core` | 1 | `.` · `./tooling` | `test:branding-core` |
| `native-core` | 1 | `.` · `./platform-globals` · `./scripts/validate-android-r8-policy` | `test:native-core` |
| `ota-core` | 1 | `.` · `./publishing` · `./server` | `test:ota-core` |
| `storage-core` | 1 | `.` · `./server` · `./profiles-config` | `test:storage-core` |
| `storage-image-manager-core` | 1 | `.` · `./services` · `./client-lifecycle` | `test:storage-image-manager-core` |
| `notifications-core` | 1 | `.` · `./server` · `./builder` · `./providers` | `test:notifications-core` |
| `auth-core` | 1 | `.` · `./server` | `test:auth-core` |
| `catalog-core` | 1 | `.` · `./server` | `test:catalog-core` |
| `product-style-core` | 1 | `.` · `./server` | `test:product-style-core` |
| `product-core` | 1 | `.` · `./server` | `test:product-core` |
| `hero-slider-core` | 1 | `.` · `./server` | `test:hero-slider-core` |
| `featured-marquee-core` | 1 | `.` · `./server` | `test:featured-marquee-core` |
| `trending-ribbon-core` | 1 | `.` · `./server` | `test:trending-ribbon-core` |
| `page-snapshot-core` | 1 | `.` | `test:page-snapshot-core` |
| `dev-core` | 1 | `.` · `./server` | `test:dev-core` |
| `system-logs-core` | 1 | `.` · `./server` | `test:system-logs-core` |
| `vercel-deploy-core` | 1 | `.` | `test:vercel-deploy-core` |
| `service-mirror-core` | 1 | `.` | `test:service-mirror-core` |
| `map-core` | 1 | `.` | `test:map-core` |
| `format-core` | 1 | `.` | `test:format-core` |
| `google-play-store-assets-core` | 1 | `.` · `./images` | `test:google-play-store-assets-core` |
| `signed-token-core` | 1 | `.` | `test:signed-token-core` |
| `service-runtime-core` | 1 | `.` | `test:service-runtime-core` |
| `architecture-core` | 1 | `.` | `test:architecture-core` |
| `observability-core` | 1 | `.` · `./dev-trace` · `./server` | `test:observability-core` |
| `env-core` | 1 | `.` · `./files` | `test:env-core` |
| `release-core` | 1 | `.` · `./console` · `./console-server` · `./console-artifacts` | `test:release-core` |
| `secrets-core` | 1 | `.` | `test:secrets-core` |

Compositions are gated collectively by `test:compositions`, not individual `test:*-core` scripts.

### Rule matrix (layer-1 capability packages)

| # | Rule | orders-core | data-core | native-core | ota-core | storage-core | notifications-core | auth-core | catalog-core | product-style-core | product-core | dev-core | system-logs-core | vercel-deploy-core | service-mirror-core | map-core |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| 1 | Core Module | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 2 | Single public API | ✅ 1 door | ✅ 24 doors | ✅ 2 doors | ✅ 3 doors | ✅ 2 doors | ✅ 4 doors | ✅ 2 doors | ✅ 2 doors | ✅ 2 doors | ✅ 2 doors | ✅ 2 doors | ✅ 2 doors | ✅ 1 | ✅ 1 | ✅ 1 |
| 3 | Tests gate the build | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 4 | Internal validation | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 5 | No deep imports | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 6 | Branch protection | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 7 | Independent package | ✅ 0 edges | ✅ 22 app edges + 20 package doors, pinned | ✅ 0 edges | ✅ 3, designated + pinned | ✅ 1 → dev-core | ✅ 4, designated + pinned | ✅ 0 edges | ✅ 0 edges | ✅ 0 edges | ✅ 0 edges | ✅ 0 edges | ✅ 0 edges | ✅ 0 edges | ✅ 0 edges | ✅ 1 → native-core |
| 8 | SRP | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

Other sealed packages (`account-declarations`, `account-bridge`, the six `*-composition` packages)
follow the same eight rules; their shapes differ (data-only declarations, device bridge, layer-2
wiring) and are documented in their own sections below rather than duplicated in this matrix.

Rule 2 counts doors rather than asserting one. `native-core`'s second door is a validation script
the release console runs; the rest are justified where they appear. **A package with more doors than
its neighbours is not automatically worse** — what rule 2 forbids is an undeclared door, and every
door here is in an `exports` map that `architecture:check` reads.

Rule 6 is enforced repository-wide and applies to the whole branch, not per package: branch
protection blocks force-pushes and deletions, requires a pull request, requires linear history and
resolved conversations, and requires the `verify` status check.

**Rule 7 for the compositions is a different question, not a weaker answer.** Layer 2 exists to wire
application services into an account's runtime; reaching `@/features/*` is its whole job, and a
composition that imported nothing from the app would compose nothing. What rule 7 forbids there is
the *reverse* — the app reaching into a composition's internals — and the single declared door plus
the seal contract cover that. The edges that matter for layer 2 are the ones a capability-closure test
watches: `orders` reaching image storage, `notifications` reaching product data. Those are asserted
per account, and they fail red.

The edges worth budgeting are on layer 1 packages, described under
[Rule 7 runs both ways](#rule-7-runs-both-ways).

### The four layers

Collapsing any two of these has already caused an outage-class defect, so the separation is part of
the contract rather than a matter of taste.

```text
  layer 4  @asol/account-bridge          the only code that knows >1 account exists;
                                         runs on the device, never on a server (Rule 0)
  layer 3  @asol/account-declarations    pure data: project, token var, env keys, entry points
  layer 2  @asol/*-composition           the only place that knows an account uses db AND images
  layer 1  vercel-deploy-core, service-mirror-core, service-runtime-core,
           storage-core, ota-core, native-core, notifications-core, auth-core,
           catalog-core, product-style-core, product-core, dev-core,
           system-logs-core, map-core, data-core, orders-core,
           format-core, signed-token-core, env-core, observability-core,
           architecture-core, release-core, secrets-core, data-health-core,
           backup-core, branding-core, hero-slider-core, featured-marquee-core,
           trending-ribbon-core, page-snapshot-core, storage-image-manager-core,
           google-play-store-assets-core
                                         capability logic, held once
```

`data-core` is the largest layer-1 package and the only one holding a database driver. Four
other layer-1 packages import one of its doors, which is the same layer talking to itself rather
than a new direction: see [data-core-module.md](./data-core-module.md).

Measured dependencies, rather than intended ones:

| Package | Imports |
| :-- | :-- |
| `account-declarations` | **nothing** — asserted by its own test |
| `native-core`, `branding-core`, `service-mirror-core`, `service-runtime-core`, `catalog-core`, `product-style-core`, `product-core`, `hero-slider-core`, `featured-marquee-core`, `trending-ribbon-core`, `page-snapshot-core`, `google-play-store-assets-core`, `dev-core` | nothing |
| `format-core`, `signed-token-core`, `env-core` | **nothing** — asserted by their own tests |
| `auth-core` | `signed-token-core` (the envelope its session token travels in) |
| `observability-core` | `data-core` (`./browser`, `./telemetry`) |
| `architecture-core` | `ota-core` (`./publishing`, for the native-surface report) |
| `release-core` | `vercel-deploy-core`, `ota-core` (`./publishing`, for release-console version truth) |
| `data-health-core` | **nothing** — runtime selection is explicit input |
| `backup-core` | `storage-core` (`./server`); database access is a port |
| `secrets-core` | **nothing** |
| `orders-core` | **nothing** — asserted by its own test |
| `data-core` | `orders-core`, `dev-core`, `storage-core`, `system-logs-core`, `product-core`, `auth-core`, `notifications-core`, `ota-core`, `data-health-core`, `backup-core`, `hero-slider-core`, `featured-marquee-core`, `trending-ribbon-core` |
| `notifications-core` | `data-core` (one door: `./notifications`), `signed-token-core`, `branding-core` |
| `map-core` | `native-core` (platform GPS and location permission) |
| `storage-core` | `dev-core` (local path contract for `LocalStorageProvider`) |
| `storage-image-manager-core` | `storage-core`, `data-core` (`./browser`), `native-core`, `system-logs-core` |
| `system-logs-core` | **nothing** |
| `vercel-deploy-core` | `account-declarations` |
| `orders-`, `products-`, `profiles-composition` | `account-declarations` |
| `submain-composition` | `account-declarations` |
| `sub2main-composition` | `account-declarations` |
| `notifications-composition` | `account-declarations`, `notifications-core` |
| `ota-core` | `native-core`, `data-core` (`./browser`, `./ota`) |
| `account-bridge` | `native-core`, `branding-core` |

Regenerate this table rather than editing it by hand:

```bash
for d in packages/*/; do p=$(basename $d); echo "$p -> $(find $d/src -name '*.ts' | grep -v /tests/ | xargs grep -hoE "from ['\"]@asol/[a-z-]+" 2>/dev/null | sed "s|from ['\"]||" | sort -u | grep -v "^@asol/$p$" | tr '\n' ' ')"; done
```

Three of these look like layer violations and are not:

**Layer 1 reading layer 3** (`vercel-deploy-core` → `account-declarations`) is safe precisely
because layer 3 imports nothing. Data carries nothing with it, so the direction that matters — a
composition dragging the deploy engine into a deployment — cannot happen through it.

**`map-core` reading `native-core`** is the same rule 9 case: the map must never touch
`navigator.geolocation` or a Capacitor plugin itself, so its GPS provider goes through the device
door and inherits permission handling and the error taxonomy. See [map-core-module.md](map-core-module.md).

**`ota-core` and `account-bridge` reading `native-core`** is rule 9 working as intended, not being
broken. Platform identity is owned once; upgrading Capacitor touches `native-core` alone, and its
consumers see an unchanged API. A second platform detector inside the channel would be a second
source of truth, and the two would disagree the first time either changed.

**Layer 2 reading layer 1** (`notifications-composition` → `notifications-core`) is what layer 2 is
*for*. A composition exists to wire capability packages into one account's runtime; a composition
that imported no capability would compose nothing. The direction that would be wrong is the reverse —
`notifications-core` reaching a composition — and it imports nothing at all.

Note that `notifications-composition` is the only composition holding a capability edge. The other
three reach their capabilities through the application's data-access layer rather than a package,
which is not an inconsistency: notification delivery was extractable into a sealed package, and
product, order and profile reads were not. See
[`@asol/notifications-core` — what was sealed](#asolnotifications-core-what-was-sealed-and-what-was-not).

**Layer 3 must stay out of layer 1.** The compositions once read `DECLARATION.project` from
`@asol/vercel-deploy-core`, which contains `child_process`, `fs` and the Vercel token handling. That
single edge made layer 2 impossible to put on a request path: routing a service route through a
composition would have mirrored the entire deploy engine into that deployment. Declarations are their
own package for that reason, and `@asol/account-declarations` has a test asserting it imports
nothing at all.

**Layer 3 exposes a door per account.** A composition imports
`@asol/account-declarations/orders`, never the barrel. Importing the barrel mirrors all five
declarations into that deployment, which put the products account's `PRODUCT_R2_*` key names inside
the orders deployment — caught by a capability-closure test, not by review.

### Inside an account: divided by task

Layer 2 does not return a flat bag of services. Each account's runtime is grouped by **task**, and
the composition is the connector between those tasks:

| Account | Tasks |
| :-- | :-- |
| `orders` | `database` · `config` |
| `products` | `database` · `catalog` · `images` · `config` |
| `profiles` | `database` · `images` · `config` |
| `notifications` | **`crypto`** · `delivery` · `config` |
| `submain` | `search` · `cart` · `catalog` · `config` |
| `sub2main` | `profile` · `products` · `storage` · `catalog` · `config` |

**An absent key is a capability the account cannot reach.** `orders` exposes no `images` and no
`crypto` because it holds neither an R2 credential nor a signing secret — so there is nothing to
call, rather than a rule saying do not call it. The composition tests assert the *absence*
(`assert(!('images' in runtime))`), not only the presence.

Two groupings are worth the explanation they carry:

- **`catalog` is separate from `database`** in `products`. Categories come from JSON inside the
  bundle, not from Turso. Filing them under `database` would imply a query that never happens, and
  would make a missing database credential look like it should break them.
- **Product Style and product domain contracts** (`@asol/product-style-core`, `@asol/product-core`)
  are layer-1 packages with zero `@asol/*` edges. The `products` account's `catalog` task still
  reaches `categoryService` in the app; Product Style JSON under `public/product/style/` is read
  through `@asol/product-style-core/server` by search and by `/product?mode`, and is edited from
  `/dev/category-selector` through the dev API wrapper.
- **`images` is marked `writeAccess: false`** in `products` and `profiles`. Both hold `R2_*` but no
  `R2_API_TOKEN`: they can turn a stored key into a public URL and cannot create buckets, change
  CORS, or upload. The task is named so the narrowness reads as deliberate rather than unfinished.

`notifications` is the only account with a `crypto` task, and it is the reason that account exists:
a grant is a decision the main app already signed, and verifying it *is* the whole authorisation
step. There is deliberately no bearer-token path — a shared bearer would let anything holding it
send anything to anyone, while a grant authorises exactly one pre-approved send.

### Where more than one door is correct rather than a violation of rule 2

Rule 2 asks for **a small set of explicitly named doors**, not for exactly one. What it forbids is an
undeclared door — a deep path that resolves. Every door in this repository is in an `exports` map
that `architecture:check` reads, and the seal is the same whether a package has one or four: a fixed
number of declared entries, no deep imports, and a contract test pinning each entry's module graph.

The recurring reason for a second door is that a package's halves run in different worlds:

- a runtime/browser entry, which must never transitively reach a node builtin;
- a publishing/server entry, which may use `@aws-sdk/*`, `google-auth-library`, and `node:*`.

A single door would bundle the node-only half into the shipped web bundle. `storage-core` splits on
exactly that line, and `ota-core` adds a third for publishing, which needs neither of the others.

`notifications-core` has four, and each was added because merging it produced a concrete failure
rather than a preference — see [Four doors, each earned by a failure](#four-doors-each-earned-by-a-failure).
The pattern worth taking from it: **a door count is evidence of how many distinct load-time
contracts a package has**, not of how disciplined it is. Two of its four exist because the modules
behind them read credentials at import time, and one exists because a consumer's own barrel has a
stricter rule than the package's.

---

## Standing weaknesses

**Rule 3's guard now covers the added packages.** Every gate added in the 2026-08 consolidation
is in `build`, `build:static`, `test` and the `verify` job; `ci:coverage` reports 31 package gates
running in CI and fails if any is missing from the workflow.

**Rule 3 has been missed three times in a row.** In each migration the tests were written and passed,
but the new `test:*-core` script was not added to the `build` and `build:static` chains — so a broken
module did not fail a release build. A test that does not gate the release does not satisfy rule 3.

A guard now exists for this: a test asserting that every `test:*-core` script in `package.json` also
appears in the `build`, `build:static`, and `test` chains. Keep it.

**Rule 6 is fully enforced.** Branch protection on `main` is applied and read back by
`npm run github:protect` (`scripts/protect-main-branch.ts`), which reads `GITHUB_ADMIN_TOKEN` from
`.env.local`. See [14. Environment Variables](./data-layers/14-environment-variables.md) for that
token's scope and why it should be narrower than it currently is.

| Setting | State |
| :-- | :-- |
| Force-push to `main` blocked | ✅ |
| Branch deletion blocked | ✅ |
| Pull request required | ✅ |
| Linear history required | ✅ |
| Conversations must be resolved | ✅ |
| Required status check `verify` | ✅ |
| `enforce_admins` | deliberately **off** — `deploy:all` pushes to `main` directly and is the only supported release path |
| Code-owner review | **removed** — see [rule 6](#6-branch-protection) |

**The required status check is the reviewer here.** It was added only after `verify` was confirmed
on a real green run: GitHub matches on the check-run name it actually reports, and a name that never
reports blocks every merge permanently — a worse failure than no protection at all. Confirm any new
check name against a real run before adding it to `REQUIRED_STATUS_CHECKS`.

`verify` is the job id in `.github/workflows/native-core.yml`. The file and the workflow keep the
`native-core` name even though they now guard thirty-one packages, because renaming either is
harmless while renaming the **job** is not — and a name that reads slightly stale costs less than a
required check that never reports. `npm run ci:coverage` pins the job id, refuses a `name:` on that
job (which would replace the check-run name), and asserts that branch protection still requires it.

**A reviewer that does not run the gate is not a reviewer.** The workflow's gate list was a
hand-maintained copy of the `test:*-core` scripts in `package.json`, and it had drifted by seven
packages — `auth-core`, `catalog-core`, `product-core`, `product-style-core`, `dev-core`,
`system-logs-core` and `map-core` never ran on the check that gates every merge, so breaking one of
them merged green. `ci:coverage` now fails when any package gate is missing from CI, and it runs in
`verify:all` and in `test:deployment-tools`. This is the same shape as the rule 3 weakness below:
the test existed, and nothing made it gate anything.

**Two settings stay off on purpose.** `required_signatures` and `enforce_admins` would each reject
`deploy:all`'s direct unsigned push to `main`, which is the only supported release path. A protection
rule that blocks releases is not stricter — it is broken.

---

## Standing weakness: local green is not CI green

The `native-core` workflow failed on every push from 2026-08-15 onward while every local gate passed.
Three separate causes, each invisible to a developer machine, each found only by reading CI logs:

| Cause | Why it could not fail locally |
| :-- | :-- |
| The notifications contract test asserts `generated/src` is non-empty | `services/*/generated/` is git-ignored, so a clean checkout has no mirrors; locally they are always on disk |
| `ota:publish --dry-run` required `ASOL_OTA_R2_PUBLIC_URL` | The dry-run branch called `getOtaManifestUrl()` for a release it never publishes; developer machines have the variable, CI does not |
| `services:build` could not find Next.js | Each `services/<name>/` is its own project, not a workspace member, so a root `npm ci` installs nothing for it; locally those folders already had `node_modules` |

Fixes: the workflow runs `npm run services:sync` first; the dry run no longer demands upload
configuration; and `scripts/build-all-services.ts` installs each service's dependencies when they are
absent, which is also what Vercel does.

The pattern behind all three: **anything that depends on state a clean checkout does not have will
pass locally and fail in CI.** Git-ignored generated files, `.env.local` values, and per-directory
`node_modules` are the three shapes it takes here. A local gate cannot detect any of them; only a
clean-checkout run can.

A related lesson about diagnostics: the OTA failure read `OTA publish failed: OTA publish failed` for
weeks because the real cause was stored in the error's `details` and never printed. **A failure that
does not explain itself costs more than the bug.** `packages/ota-core/scripts/ota-publish.ts` now
prints the cause and its stack.

## Rule 7 runs both ways

Rule 7 says other modules know nothing of a package's internals. The reverse — a package knowing the
application — is equally binding.

`ota-core` reached into `@/` in ten places. **Five were inverted**: it now declares ports in
`packages/ota-core/src/ports/` for system-log telemetry and the super-admin predicate, and the
application registers implementations through `src/features/ota/ota-core-ports.ts` (browser) and
`src/features/ota/server.ts` (server). Those two files are the seam, and they are the only modules
allowed to know both sides.

The inversion is safe to ship to a live OTA runtime because **every port defaults safely**:
telemetry no-ops and the identity predicate returns `false`. A forgotten registration costs log
lines or admin access — never updates. That property is asserted by the contract test, not assumed.

### The five edges that remain, and why

| Edge | Why it is layering rather than a violation |
| :-- | :-- |
| `@asol/data-core/browser` | The central data-access module is where database code is required to live |
| `@asol/data-core/ota` | Same layer. Moving it into the package would break `ALLOWED_DRIZZLE_ORM_FILES_PATTERN` — trading one edge for a broken rule |
| `@/core/api` | The designated HTTP transport, itself governed by `ALLOWED_FETCH_FILES` |
| `@/core/config/public-env` | A config leaf |
| `@/features/categories` | Build-time only, in `publishing/build/out-public-assets.ts` |

`@/features/categories` is the judgement call. It could be a port, but a port needs a safe default,
and the safe default for build-time asset generation is an **empty** asset set — a silently wrong
build artifact. An import that fails loudly beats a default that fails quietly.

**Driving the count to zero was not the goal; naming which edges are real is.** Four of the original
ten were never violations, and treating them as such would have produced worse architecture.

### The budget

`packages/ota-core/src/tests/contract/app-edges.test.ts` pins the five remaining edges, and
separately names the five that were inverted so re-importing one fails with *"this was deliberately
inverted into a port"* rather than a generic message. It also fails if a listed edge disappears
without the list being updated, so the list cannot rot into decoration. `@asol/account-bridge` has
the same guard (T1b) over three edges.

**These lists should only ever shrink.**

---

## Standing weakness: a guard that measures nothing

Three guards in this repository have, at some point, passed while checking nothing. It is the most
expensive failure mode here, because a green check is taken as evidence.

| Guard | How it was empty | How it is anchored now |
| :-- | :-- | :-- |
| Rule 0's `T1` | Named itself a "module graph" test but scanned only the channel's own two files. A node builtin one hop away — through `@asol/native-core` or `@/core/config/*`, both of which it imports — would have passed | Walks the real graph (119 files) and asserts it **reached `native-core` specifically**, not merely "more files than we started with" |
| `T1`'s own anchor | The first fix stopped after 4 hops because `@asol/native-core` contains the scope slash, so the door was computed as `"./"` and resolved to nothing. The anchor `visited.size > entryFiles.length` was `6 > 2` — it passed | Anchored on a named package and a floor of 50 files |
| OTA port registration | Registered in one component; the splash uses the OTA runtime at app start, so the ports stayed at their safe defaults and the super-admin predicate returned `false` for a real super admin | A contract test requires every OTA runtime consumer to import the seam **and** call it |

The pattern: **an existence check is not a coverage check.** `size > 0`, `matches.length > previous`,
"the file mentions the symbol" — each passes while the thing being measured is absent. Anchor a guard
on something specific that must be present, and assert a floor that a broken walk cannot clear.

Both the OTA edge budget and the port-registration test also fail when a *declared* item disappears,
so neither list can rot into decoration while still reporting green.

---

## Verifying a split against the state before it

The packaging work moved every account's environment keys out of four deploy scripts and into
`@asol/account-declarations`. Those keys *are* the credential-isolation boundary, so "did anything
get lost?" is the question that matters most, and it has an exact answer rather than an opinion.

Git holds the reference copy. Commit `805de997` is the last state before the split began:

```bash
git show 805de997:scripts/deploy-orders-service.ts
```

Compare the `REQUIRED_ENV_KEYS` / `OPTIONAL_ENV_KEYS` arrays there against `requiredEnv` /
`optionalEnv` in `packages/account-declarations/src/accounts/<account>.ts`. The measured result at
the time of writing:

| Account | required | optional |
| :-- | :-- | :-- |
| notifications | 4 → 4 identical | 7 → 7 identical |
| products | 2 → 2 identical | 6 → 6 identical |
| orders | 2 → 2 identical | 16 → 16 identical |
| profiles | 2 → 2 identical | 19 → 19 identical |

Nothing lost, nothing added, and nothing moved between required and optional — a key crossing that
line silently changes whether a deploy aborts or continues.

**Compare the arrays, not the whole file.** A first attempt matched every capitalised string and
reported `DELETE` and `READY` as differences; they are HTTP method and state names in the old
script. A comparison that reports noise trains you to ignore it.

Three guards keep this true without re-running the comparison: `C2` pins the counts (11 / 8 / 18 /
21), each `assert<Account>Env` reads `requiredEnv` so validation cannot disagree with what the
deploy pushes, and `C4` asserts no mirror carries another account's token name.

---

## `@asol/notifications-core` — what was sealed, and what was not

The notifications feature was 73 files in `src/features/notifications`. Only 22 of them moved
into a package, and the split was decided by measurement rather than by folder name.

| Door reached | Files reachable | Edges into the app | Sealable? |
| :-- | --: | --: | :-- |
| `service-runtime` (delivery) | 38 | **16**, all `data-access` + `core/config` | yes |
| `server` (broadcast, admin) | 44 | 30 — adds `auth`, `profile` | no |
| `index` (UI, hooks) | 98 | **50** — theme, i18n, monitor, preferences, components | no |

The delivery path's edges land entirely on designated layers, which is the same standard applied to
`ota-core`. The UI half reaches the theme and component trees by nature; a package that dragged
those in would satisfy rule 7 on paper and break it in fact. **A folder move is not an isolation.**

So `@asol/notifications-core` holds the domain vocabulary and the push fan-out — FCM, APNs, Web
Push — plus the grant protocol. That is exactly what the `asol-notifications` Vercel account runs.
The UI, hooks, badges, native inbox and analytics stayed in `src/features/notifications`, which now
consumes the package.

### Android channel creation stays in `native-core`

`ensureNotificationChannels`, `registerForPushNotifications` and the channel constants belong to
`@asol/native-core`, and the notifications package has a test asserting it imports no `@capacitor/*`
module and creates no channel. Rule 9: upgrading a Capacitor plugin must touch one package.

This was already true before the extraction — the feature had zero direct Capacitor imports — and
the test exists so it stays true.

### Four doors, each earned by a failure

Rule 2 asks for a small fixed set, not for one. Every door here was added because merging it caused
a concrete breakage:

- **`.`** — vocabulary. The app's own barrel re-exports it wholesale, so it must carry no
  implementation object.
- **`./builder`** — `NotificationBuilder` and the template loader. Both halves construct
  notifications, but placing them on `.` leaked an implementation object into the app barrel and its
  boundary test failed.
- **`./server`** — delivery and grants. Pulls `google-auth-library`, `node:http2`, the provider SDKs.
- **`./providers`** — APNs and Web Push, which read credentials **at module load**. Re-exporting
  them from `./server` made that door unopenable without a valid VAPID pair, and every test touching
  it failed with *"Vapid private key should be 32 bytes long"*.

### A stub that stopped stubbing

The web-push contract test replaced the transport by patching `Module.prototype.require`, which only
intercepts CommonJS. Once the provider moved into a package declaring `"type": "module"`, the import
became a real ESM binding, the patch silently stopped applying, and the test began calling the live
library.

The transport is now injected through the constructor. **A stub that stops stubbing without failing
is worse than no stub** — the test kept passing its assertions while exercising something else.

---

## `@asol/auth-core` — what was sealed, and what was not

Auth logic was spread across `src/features/auth/` utilities, validation modules, and a separate
`src/features/account-deletion/` feature folder. The sealed package holds domain rules that must
not drift between client and server:

| Concern | In `@asol/auth-core` | Stays in the app |
| :-- | :-- | :-- |
| Password hashing (scrypt) | yes | — |
| Session token sign/verify | yes | — |
| Registration/login/profile Zod schemas | yes (browser door) | — |
| `AuthOperationsService` / `AccountDeletionService` | yes (server door) | — |
| IndexedDB session persistence | — | `session-api-service.ts` |
| Turso repositories / SQL deletion | — | `data-access` domains + bootstrap |
| UI (login, profile, deletion page) | — | `src/features/auth/` |

Two doors: `@asol/auth-core` (browser-safe) and `@asol/auth-core/server`. Full file map and
security notes: [auth-core-module.md](./auth-core-module.md).

### Two doors, same pattern as `storage-core`

- **`.`** — constants, entities, and Zod schemas safe for client bundles (`createLoginSchema`,
  `createProfileSchema`, deletion phrase helpers).
- **`./server`** — scrypt password hashing, HMAC session tokens, `AuthOperationsService`,
  `AccountDeletionService`, and normalization helpers. App repositories are wired through ports in
  `auth-core-bootstrap.server.ts`.

Measured rule 7: **0 import edges** into other `@asol/*` packages. `test:auth-core` gates `build`,
`build:static`, and `test`.

---

## `@asol/catalog-core` — what was sealed, and what was not

Catalog v3 contracts lived in `@asol/catalog-core/` and the full-tree validator lived in
`scripts/validate-catalog.ts`. The sealed package holds everything that must stay identical across
Catalog Studio, CI, and runtime consumers:

| Concern | In `@asol/catalog-core` | Stays in the app |
| :-- | :-- | :-- |
| Catalog v3 TypeScript types | yes | — |
| Zod schemas + JSON Schema sources | yes (browser door) | — |
| Display visibility helpers | yes (browser door) | — |
| `validateCatalogV3` + `resolveCatalogRoots` | yes (server door) | — |
| `categoryService` projections | — | `src/features/categories/` |
| Catalog Studio UI + filesystem writes | — | `src/features/catalog-studio/` |
| JSON files under `public/catagory/` | — | static data (read/written by studio) |
| `user_specialties` Drizzle schema | — | `data-access` (columns passed into validator) |

Two doors: `@asol/catalog-core` and `@asol/catalog-core/server`. `@asol/catalog-core` is now a
thin re-export shim. Full map: [catalog-core-module.md](./catalog-core-module.md).

### Two doors, same pattern as `storage-core`

- **`.`** — types, Zod contracts, `isCatalogItemVisible`, `visibleCatalogItems`.
- **`./server`** — `validateCatalogV3`, `resolveCatalogRoots`. Node `fs` only; no app imports.

Measured rule 7: **0 import edges**. `test:catalog-core` gates `build`, `build:static`, and `test`.

---

## `@asol/product-style-core` — what was sealed, and what was not

Product Style types, normalization, JSON persistence, and search-column resolution were split
across UI helpers, a dev API route, and `product-search-fields.server.ts`.

| Concern | In `@asol/product-style-core` | Stays in the app |
| :-- | :-- | :-- |
| Product Style types + defaults | yes | — |
| `normalizeProductStyleComponents` | yes | — |
| Style JSON read/write + `index.json` rebuild | yes (`/server`) | — |
| Search-column filtering helper | yes (`/server`) | — |
| `DeveloperCategorySelector` + style editors | — | `src/components/` |
| `api/dev/product-style/route.ts` | — | thin dev wrapper |
| `public/product/style/*.json` | — | static data |
| `categoryService.resolveProductSelection` | — | `src/features/categories/` |

Two doors: `@asol/product-style-core` and `@asol/product-style-core/server`. Full map:
[product-style-core-module.md](./product-style-core-module.md).

Measured rule 7: **0 import edges**. `test:product-style-core` gates `build`, `build:static`, and `test`.

---

## `@asol/product-core` — what was sealed, and what was not

The product entity, normalization, and row mapping lived in `features/product` and
`data-access/domains/product`.

| Concern | In `@asol/product-core` | Stays in the app |
| :-- | :-- | :-- |
| `ProductDetails` / `ProductRecord` types | yes | — |
| `createEmptyProductDetails`, `normalizeProductDetails` | yes | — |
| `PRODUCT_COLUMNS`, `mapProductRow`, `productRowValues` | yes (`/server`) | — |
| `ProductService` orchestration | — | `features/product/services` |
| SQL execution + profile counts | — | `product-repository.ts` |
| Product page UI | — | `src/features/product/presentation/` |

Two doors: `@asol/product-core` and `@asol/product-core/server`. Full map:
[product-core-module.md](./product-core-module.md).

Measured rule 7: **0 import edges**. `test:product-core` gates `build`, `build:static`, and `test`.

---

## `@asol/dev-core` — what was sealed, and what was not

Local development paths and guards were duplicated across `environment.ts`, storage providers,
tooling scripts, and per-module `development-guard.server.ts` files. The sealed package holds the
contract only:

| Concern | In `@asol/dev-core` | Stays in the app |
| :-- | :-- | :-- |
| `public/sync_data` path segments | yes | — |
| SQLite filename constants | yes | — |
| `sqliteFileNameForShard()` | yes | — |
| Development predicates + shared guards | yes | — |
| Absolute path resolvers | yes (`/server`) | — |
| `getServerRuntimeContext()` | — | `core/config` |
| SQLite DB clients | — | `data-access` |
| `LocalStorageProvider` | — | `@asol/storage-core` (imports paths from here) |
| `db:ensure` / shard tooling | — | `data-access/tooling` |
| Dev UI and backup modules | — | `src/app/dev`, `src/modules/*` |

Two doors: `@asol/dev-core` and `@asol/dev-core/server`. Full map:
[dev-core-module.md](./dev-core-module.md).

Measured rule 7: **0 import edges** into other packages. `test:dev-core` gates `build`,
`build:static`, and `test`.

---

## `@asol/system-logs-core` — zero silent failures

Central error telemetry was spread across `src/features/system-logs/`, API routes, and
`data-access` repositories. The sealed package holds everything that must stay identical across
Web, Android WebView, iOS WebView, and server:

| Concern | In `@asol/system-logs-core` | Stays in the app |
| :-- | :-- | :-- |
| Unified global capture + dedupe | yes | — |
| Memory store (Super Admin live view) | yes | — |
| Fingerprinting, sanitization, correlation IDs | yes | — |
| SQLite repository + retention + alerts | yes (server door) | — |
| Ingest validation + rate limiting | yes (server door) | — |
| SSE stream hub | yes (server door) | — |
| Super Admin UI | — | `SuperAdminLogsPage.tsx` |
| Port wiring (DB, monitor, native crash) | — | `system-logs-core-bootstrap*.ts` |

Two doors: `@asol/system-logs-core` and `@asol/system-logs-core/server`. The application registers
database and monitor ports through bootstrap modules — the same inversion pattern as `ota-core`.

Measured rule 7: **0 import edges** into other `@asol/*` packages. `test:system-logs-core` gates
`build`, `build:static`, and `test`. A scenario-coverage test asserts every capture surface file
exists so a removed handler cannot pass CI silently.

---

## Standing weakness: `scripts/` was not typechecked

`tsconfig.json` listed `scripts` in `exclude`, so **73 script files had no type checking at all** —
`deploy-all`, `cap-build`, every deploy and sync script, and every `architecture-check` contract
file. `npm run typecheck` reported zero errors while never reading them.

It hid a live break. `scripts/cap-build.ts` imports `nativeVersionFromBaseline` from
`@asol/ota-core/publishing`, and that door never exported it: `native-gate` imported the function
and did not forward it. So the **full Android release failed before building anything** — both the
console's "start full release" button and `npm run release:android` — with
`nativeVersionFromBaseline is not a function`. The export is now made from the module that defines
it, `domain/versioning/native-version`.

Removing the exclusion surfaced 17 errors in 7 files, every one a real defect rather than a typing
nicety:

| Kind | Example |
| :-- | :-- |
| Imports of deleted modules | `../ota/ota-native-compatibility`, `./provision-database-shards` — both moved in earlier migrations |
| Wrong value shape | `architecture-check.storage-core-contract.ts` pushed **strings** into the shared `Violation[]`; the report renders `.layer`/`.file`/`.violation`, so any violation it raised would have printed as blanks |
| Over-strict parameter type | `runNpmScript`'s `env` was typed `NodeJS.ProcessEnv`, which demanded `NODE_ENV` from callers adding three deployment variables — and Next marks it readonly, so they could not supply it |
| Unsupported syntax | a regex `s` (dotAll) flag against an ES2017 target |

**The lesson is the same one this document keeps recording**: a gate that excludes a directory
reports green about a directory it never opened. `scripts/` is where releases and deploys live —
the least safe place in the repository to leave unchecked.

Keep `scripts` out of `exclude`. A new script that does not typecheck is a release path that does
not work yet.

## Application `@/` ports (capability packages)

Capability packages must not import `@/`. Application dependencies are registered through
ports, following the same pattern as `orders-core` and the original `ota-core` telemetry /
identity inversion:

| Package | Port module | Wired from |
| :-- | :-- | :-- |
| `@asol/notifications-core` | `src/ports/server-config.ts` | `src/features/notifications/notifications-core-ports.ts` (+ notifications-composition) |
| `@asol/storage-core` | `src/ports/http-fetch.ts` | `src/features/storage/storage-core-ports.ts` |
| `@asol/ota-core` | `src/ports/index.ts` (`httpApi`, `apiRoutes`, `publicEnv`, `appVersions`, `categories`) | `src/features/ota/ota-core-ports.ts` / `server.ts` |
| `@asol/account-bridge` | `src/ports/app-bridge.ts` | `src/features/account-bridge/account-bridge-ports.ts` |
| `@asol/data-core` | `src/ports/runtime-config.ts` | `src/features/data/data-core-ports.ts` (+ browser half) |

Composition roots: `src/core/composition/server-ports.ts` and `browser-ports.ts`.
`*-composition` packages may keep `@/` imports — they are composition roots.

`service-mirror-core` tests may mention `@/` only as sample strings for the mirror walker.
