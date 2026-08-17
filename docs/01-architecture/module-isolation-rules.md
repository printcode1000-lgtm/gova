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

---

## How the eight are enforced in practice

Rules 2, 5, and 7 are enforced by four independent layers, because any one of them alone is bypassable:

1. **`exports` in the package's `package.json`** — exactly the declared doors, never a `"./*"`
   wildcard. Deep imports fail at resolution time.
2. **ESLint `no-restricted-imports`** — bans deep paths and vendor dependencies outside the adapter
   layer.
3. **`scripts/architecture-check/architecture-check.package-seal-contract.ts`** — walks the whole
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

Eleven sealed packages, arranged in four layers. The layering is not decoration — see
[The four layers](#the-four-layers).

| # | Rule | native-core | ota-core | storage-core | account-declarations | vercel-deploy-core | service-mirror-core | account-bridge | the four `*-composition` |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| 1 | Core Module | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 2 | Single public API | ✅ | ✅ two doors | ✅ two doors | ✅ one + per-account doors | ✅ | ✅ | ✅ two doors | ✅ |
| 3 | Tests gate the build | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 4 | Internal validation | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 5 | No deep imports | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 6 | Branch protection | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 7 | Independent package | ✅ | ✅ 5 designated edges, pinned | ✅ 1 designated edge | ✅ zero imports | ✅ | ✅ | ✅ 3 edges, pinned | ✅ by design — see below |
| 8 | SRP | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

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
  layer 1  vercel-deploy-core, service-mirror-core, storage-core, ota-core, native-core
                                         capability logic, held once
```

Measured dependencies, rather than intended ones:

| Package | Imports |
| :-- | :-- |
| `account-declarations` | **nothing** — asserted by its own test |
| `native-core`, `storage-core`, `service-mirror-core` | nothing |
| `vercel-deploy-core` | `account-declarations` |
| the four `*-composition` | `account-declarations` |
| `ota-core`, `account-bridge` | `native-core` |

Two of these look like layer violations and are not:

**Layer 1 reading layer 3** (`vercel-deploy-core` → `account-declarations`) is safe precisely
because layer 3 imports nothing. Data carries nothing with it, so the direction that matters — a
composition dragging the deploy engine into a deployment — cannot happen through it.

**`ota-core` and `account-bridge` reading `native-core`** is rule 9 working as intended, not being
broken. Platform identity is owned once; upgrading Capacitor touches `native-core` alone, and its
consumers see an unchanged API. A second platform detector inside the channel would be a second
source of truth, and the two would disagree the first time either changed.

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

### Where two doors are correct rather than a violation of rule 2

`ota-core` and `storage-core` each expose two entry points because their halves run in different
worlds:

- the runtime/browser entry, which must never transitively reach a node builtin;
- the publishing/server entry, which may use `@aws-sdk/*`, `google-auth-library`, and `node:*`.

A single door would bundle the node-only half into the shipped web bundle. The seal is unchanged: a
fixed number of declared doors, no deep imports, and a contract test proving the runtime entry's module
graph stays clean.

---

## Standing weaknesses

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
| `@/modules/data-access/browser/asol-db` | The central data-access module is where database code is required to live |
| `@/modules/data-access/domains/ota/index.server` | Same layer. Moving it into the package would break `ALLOWED_DRIZZLE_ORM_FILES_PATTERN` — trading one edge for a broken rule |
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
