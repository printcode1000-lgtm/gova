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
3. **`scripts/architecture-check/architecture-check.<name>-contract.ts`** — walks the whole repository
   during `architecture:check`, which runs inside `build` and `build:static`. This is the layer that
   scans every file.
4. **Contract tests inside the package** — pin the exported surface and the module's own shape.

**The `tsconfig.json` caveat:** a `"@asol/<name>/*"` path wildcard silently defeats layer 1. It was
added once to `native-core` and made the `exports` seal non-functional until removed. Never reintroduce
it for any package.

---

## Current status

| # | Rule | native-core | ota-core | storage-core | vercel-deploy-core | service-mirror-core | account-bridge | notifications-comp | products-comp | orders-comp | profiles-comp |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| 1 | Core Module | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 2 | Single public API | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ two doors | ✅ | ✅ | ✅ | ✅ |
| 3 | Tests gate the build | ✅ | ✅ | ✅ wired | ✅ wired | ✅ wired | ✅ wired | ✅ wired | ✅ wired | ✅ wired | ✅ wired |
| 4 | Internal validation | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 5 | No deep imports | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 6 | CODEOWNERS + protection | ⚠️ | ⚠️ | ⚠️ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 7 | Independent package | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 8 | SRP | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

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

**Rule 6 is half-done and needs the repository owner.** `.github/CODEOWNERS` exists but still carries
the `@OWNER` placeholder, and **branch protection cannot be configured from code**. Until the owner
sets it in the GitHub repository settings, rule 6 is documentation rather than enforcement. Required
settings:

- require review from CODEOWNERS on any PR touching `packages/**`;
- require the `native-core` workflow's status checks to pass;
- disallow force-push to `main`.
