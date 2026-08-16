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

## 6. CODEOWNERS + Branch Protection

Ownership declared in `.github/CODEOWNERS`, and branch protection configured so the module's files
cannot be merged without review.

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
| 6 | CODEOWNERS + protection | ✅ partial | ✅ partial | ✅ partial | ✅ partial | ✅ partial | ✅ partial | ✅ partial | ✅ partial |
| 7 | Independent package | ✅ | ⚠️ 10 app edges | ⚠️ 1 app edge | ✅ zero imports | ✅ | ✅ | ⚠️ 3 app edges | ⚠️ app edges |
| 8 | SRP | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

Rule 6 is "partial" for every package for the same two reasons, neither of which is per-package: no
second repository member, and no required status check. Rule 7's warnings are the app edges described
under [Standing weakness: rule 7 runs both ways](#standing-weakness-rule-7-runs-both-ways).

### The four layers

Collapsing any two of these has already caused an outage-class defect, so the separation is part of
the contract rather than a matter of taste.

```text
  layer 4  @asol/account-bridge          the only code that knows >1 account exists;
                                         runs on the device, never on a server (Rule 0)
  layer 3  @asol/account-declarations    pure data: project, token var, env keys, entry points
  layer 2  @asol/*-composition           the only place that knows an account uses db AND images
  layer 1  vercel-deploy-core, service-mirror-core, storage-core, ota-core, native-core
                                         capability logic, held once, never importing each other
```

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

**Rule 6 is now enforcement, with one part still open.** `.github/CODEOWNERS` names a real owner, and
branch protection on `main` is applied and verified by `npm run github:protect`
(`scripts/protect-main-branch.ts`), which reads `GITHUB_ADMIN_TOKEN` from `.env.local`. See
[14. Environment Variables](./data-layers/14-environment-variables.md) for that token's scope and why
it should be narrower than it currently is.

| Setting | State |
| :-- | :-- |
| Force-push to `main` blocked | ✅ |
| Branch deletion blocked | ✅ |
| Pull request required | ✅ |
| `enforce_admins` | deliberately **off** — `deploy:all` pushes to `main` directly and is the only supported release path |
| Review from CODEOWNERS on `packages/**` | ❌ **impossible today** |
| Required status checks | ❌ not yet set |

**Why code-owner review cannot be turned on.** The repository has a single owner, and GitHub will not
accept a review from the author of a pull request. Enabling it would block every pull request the
owner opens. `npm run github:protect -- --require-codeowner-review` turns it on the day a second
member exists; until then rule 6's review half is blocked by repository membership, not by code.

**Required status checks are left empty on purpose.** A required check whose name never reports
blocks every merge permanently — a worse failure than no protection at all. Add the real check name
to `REQUIRED_STATUS_CHECKS` in `scripts/protect-main-branch.ts` only after confirming it on a green
run.

---

## Standing weakness: local green is not CI green

The `native-core` workflow failed on every push for a long stretch while every local gate passed. The
cause: `services/*/generated/` is git-ignored, so a clean checkout has no mirrors, and the
notifications contract test asserts the mirror is non-empty. Locally the mirrors are always on disk.

The workflow now runs `npm run services:sync` before anything else. The general lesson is worth
keeping: **any check that depends on git-ignored generated state passes locally and fails on a clean
checkout**, and the repository will not tell you — the workflow has to.

## Standing weakness: rule 7 runs both ways

Rule 7 says other modules know nothing of a package's internals. The reverse — a package knowing the
application — is equally binding and is where this repository is weakest. `ota-core` reaches into
`@/` in ten distinct modules (database, auth, system logs, API client).

Inverting those dependencies is real work. In the meantime the edges are **budgeted, not fixed**:
`packages/ota-core/src/tests/contract/app-edges.test.ts` lists every one and fails if a new edge
appears *or* if a listed one disappears without the list being updated. `@asol/account-bridge` has
the same guard (T1b) over three edges. **These lists should only ever shrink.**
