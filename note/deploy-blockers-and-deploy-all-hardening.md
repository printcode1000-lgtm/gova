# MANDATE: unblock the release, then harden `deploy:all`

Repository: `C:\Users\hesham\Desktop\gova` (appId `hgh.asol.app`, "ASOL").
Baseline before the native-core migration: `3f581aedda9c13ce2942fc22a4b9b9a7ed63b295`.

**`deploy:all` was NOT run.** An audit found the release pipeline is broken: `npm run build` fails,
so a Vercel production build would fail after the push. Fix Part A first, then implement Part B.

---

## STATUS: what the audit verified as genuinely fixed — do not undo

The previous remediation round closed most of its mandate. Verified directly:

- **iOS is now properly wired.** Duplicate Swift plugins removed from `ios/App/App/`;
  `AsolNativeCore` added to `ios/App/CapApp-SPM/Package.swift` (dependency line 38, product line 69);
  `AsolNativeCore.swift` created; `Tests/AsolNativeCoreTests/AsolNativeCoreTests.swift` now exists.
- **Validation is wired** — 27 imports of the validation module across the package (was 0).
- **Share security restored** — `isSafeUrl`, `MAX_RECEIVED_BYTES`, `validatePayload` all present again.
- **`ShareQueue` restored** with its own unit test.
- **Raw adapter exports removed** from `index.ts` (0 remain) — the dual public API is gone.
- **tsconfig `@asol/native-core/*` wildcard removed** — the `exports` seal is real now.
- **`test:native-core` added to both `build` and `build:static`.**
- **`infrastructure/capacitor/` renamed to `infrastructure/native/`.**
- **The sound-contract fallback ternary is gone** — the path is hard-pinned with a clear assertion.
- **OTA `apiPatterns` migrated to `NativeCore.*` tokens.**
- Test suite grew from 1 file to 8 (contract + unit).
- `npm run typecheck` → **PASS (0 errors)**. `npm run lint` → **PASS** (10 pre-existing warnings).

---

# PART A — RELEASE BLOCKERS (fix all five)

Current literal results:

| Command | Result |
| :-- | :-- |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS (10 pre-existing warnings) |
| `npm run architecture:check` | **FAIL — exit 1, 4 violations** |
| `npm run test:native-core` | **FAIL — exit 1** |
| `npm run test:notifications` | **FAIL — exit 1** |
| `npm run test:ota-compatibility` | **FAIL — exit 1** |

`architecture:check`, `test:native-core`, and `test:notifications` all run inside `build` and
`build:static`. **`npm run build` therefore fails, which is exactly what Vercel runs on push.**

### A1. `openExternally` — a shipped capability was silently deleted (root cause of the OTA failure)

`npm run test:ota-compatibility` fails with:
```
Error: Capability keys with no detection pattern in ota-capability-scan.ts:
  - files.open
```

This is **not a test bug — the test is correctly detecting a lost feature.** Evidence:
- Baseline `src/native-platform/files/user-files.ts:208` defined
  `async openExternally(cachePath: string): Promise<void>`.
- Baseline `scripts/ota/ota-capability-scan.ts:236` mapped
  `["files.user.openExternally", CapabilityKeys.FilesOpen]`.
- `CapabilityKeys.FilesOpen: "files.open"` still exists in
  `packages/native-core/src/domain/capabilities/capability-keys.ts:17` and is declared **shipped since
  0.2.0** in `shell-capabilities.ts:37`.
- Repo-wide grep for `openExternally` today: **0 hits.**

`NativeCore` exposes `pickFiles`, `saveFile`, `readFile`, `writeFile`, `deleteFile` — but nothing that
hands a file to the OS viewer. Users can save a file and then cannot open it.

Required:
1. Restore the capability as `NativeCore.openFileExternally` (or equivalent), porting the baseline
   implementation — it staged the file via Filesystem and handed it to the OS; see the note at
   baseline `capabilities/capability-registry.ts:96`.
2. Add the matching `apiPatterns` entry in `scripts/ota/ota-capability-scan.ts` so `files.open` is
   detectable again.
3. Add a unit test covering it.
4. **Do not** "fix" this by deleting `CapabilityKeys.FilesOpen`. That key is declared shipped since
   0.2.0; removing it would let an OTA bundle assume a capability contract that installed shells were
   promised. Restore the feature.

**Then audit every other capability key the same way.** Run `assertDetectionCoverage()` mentally
across all of `ALL_CAPABILITY_KEYS`: any key whose only pattern was an old `native-platform` token is
a candidate for the same silent loss. Report the full list you checked.

### A2. `test:native-core` asserts a method that does not exist

`packages/native-core/src/tests/contract/native-core-boundary.test.ts:98`:
```ts
assert.ok(typeof api.otaGetCurrentVersion === "function", "otaGetCurrentVersion must be a function");
```
`NativeCore` has no `otaGetCurrentVersion`. The real member is `otaNativeVersion`
(`native-core.api.ts:143`).

Required: decide which name is correct, make the API and the test agree, and check **every** other
name asserted in that test against the real API — this one slipped through, so others may have too.

### A3. Three `navigator.clipboard` call sites were never migrated

The remediation added an architecture rule banning `navigator.clipboard` outside Native Core, but left
the call sites in place, so the rule fails the build:
- `src/components/product/ProductPageContent.tsx:44`
- `src/components/super-admin/logs/SuperAdminLogsPage.cloud-errors.tsx:38`
- `src/components/super-admin/SuperAdminLogsPage.tsx:41`

All three are the same line:
```ts
write: (text: string) => navigator.clipboard?.writeText(text) ?? Promise.resolve(),
```
`NativeCore.writeClipboard` and `NativeCore.readClipboard` already exist
(`native-core.api.ts:71-72`).

Required: migrate all three to `NativeCore.writeClipboard`, preserving the existing graceful-degrade
behaviour (these currently no-op when the clipboard is unavailable — keep that, do not start throwing
in a UI copy button).

### A4. `web-push-browser.service.ts` violates the new notification boundary

Both `architecture:check` and `test:notifications` fail on:
```
src/features/notifications/infrastructure/web-push/web-push-browser.service.ts
  reaches the Native Core notification module outside its adapter;
  use the native services in infrastructure/native/.
```
Line 8: `import { NativeCore, PermissionKinds } from "@asol/native-core";`

Required: either route this through `infrastructure/native/`, **or** — if a web-push browser service
legitimately needs the permission vocabulary — amend the rule in
`src/core/architecture/notification-contract.ts` to allow exactly that import for exactly this file,
with a comment explaining why. Do not weaken the rule generally, and do not add a blanket exemption.

### A5. Finish the two leftovers from the previous round

- **Vendor names still in the public API.** `packages/native-core/src/index.ts:84-88` still exports
  `CAPACITOR_API_BASE_URL`, `CAPACITOR_NOTIFICATIONS_BASE_URL`, `CAPACITOR_PRODUCTS_BASE_URL`,
  `CAPACITOR_ORDERS_BASE_URL`, `CAPACITOR_PROFILES_BASE_URL`. Rename to vendor-neutral names
  (`API_BASE_URL`, …) and update all consumers.
- **No integration tests exist.** `packages/native-core/src/tests/` has `contract/` and `unit/` only —
  there is no `integration/` directory. The mandate required integration tests with in-memory fake
  adapters: push register → token → inbound → tap routing; permission denied; plugin missing; running
  on web; background-download; share-receive **including an item arriving before any listener
  attaches**; storage-capacity. Write them and chain them into `test:native-core`.

### A6. Remaining stale references (low severity, finish them)

- `src/features/notifications/public/notification-public-types.ts:8` — comment says "native-platform type".
- `docs/05-platform-features/notification-system.md:1380` — table row still names
  `native-platform/notifications/push-notifications.ts`.
- `docs/05-platform-features/sharing-system.md:754` — step says "run … native-platform … verification".
- `src/core/architecture/notification-contract.ts:204` — a rule still carries `owners: []`.

(The `native-platform.md` doc links in `capacitor.md:275` and `ota-update-system.md:1520` are fine —
that file still exists. `src/components/ui/AsolMap/native-platform-gps.ts` is an unrelated map GPS
provider — leave it alone.)

### Part A exit criteria — all must pass with literal output in your report

```bash
npm run typecheck
npm run lint
npm run architecture:check
npm run test:native-core
npm run test:notifications
npm run test:ota-compatibility
npm test
npm run build:static
```

After `build:static`, check `git status` on `public/asol-web-manifest.json`: a verification-only static
build rewrites `releaseId`/`version`/`minimumNativeVersion` down to the `package.json` version. If you
ran it only to prove the build works, restore it with
`git checkout -- public/asol-web-manifest.json` so a bogus release downgrade is never committed.

---

# PART B — HARDEN `deploy:all`

`scripts/deploy-all.ts` (285 lines) currently does, in order:

1. `secrets:backup`
2. `assertMainBranch()` + clear stale git lock
3. **`git add -A`** → `git commit --allow-empty` → **`git push origin main`**
4. deploy notifications, products, orders, profiles
5. verify the main Vercel production deployment via API

**The design flaw:** steps 1–3 commit and publish *everything in the working tree* to production
`main` **before a single test, lint, typecheck, or build has run.** Verification happens only in
step 5 — after the push, from Vercel, when it is already public. Today's state proves the cost: 244
uncommitted files and a failing `npm run build` would have been pushed to production and only then
discovered.

Two further sharp edges:
- `git add -A` stages *whatever is in the tree*, including scratch files and a `build:static`-mangled
  `public/asol-web-manifest.json`. There is no review, no allow-list, no diff summary.
- `--allow-empty` means a run with nothing to deploy still creates a commit and a production build.

### Required changes

**B1. Add a pre-flight gate that runs BEFORE any git write.**
Insert a `preflight()` before `assertMainBranch()` that runs, and aborts on the first failure:
`npm run lint`, `npm run typecheck`, `npm run architecture:check`, `npm test`, `npm run build:static`.
Nothing is committed or pushed unless all pass. Print a clear summary of what ran.

**B2. Add `--skip-preflight` — explicit, loud, and logged.**
Emergencies exist. Allow bypass only via an explicit flag, print a prominent warning naming every
skipped check, and record the flag in the commit message body so the shortcut is visible in history.
Never make bypass the default.

**B3. Show the diff and require confirmation for the commit contents.**
Before `git add -A`, print `git status --porcelain` plus a file-count summary. If the run is
interactive, require a typed confirmation. Add `--yes` for non-interactive/CI use. Refuse outright if
the tree contains files matching an obvious-scratch pattern (`*.log`, `*.tmp`, `__probe*`,
scratchpad paths) unless `--allow-untracked-junk` is passed.

**B4. Guard the release manifest.**
After `build:static` in preflight, detect whether `public/asol-web-manifest.json` was downgraded
relative to HEAD, and refuse to commit a lower `releaseId`/`version`/`minimumNativeVersion` unless
`--allow-manifest-downgrade` is passed. This exact footgun is documented behaviour of `build:static`.

**B5. Drop `--allow-empty`, or gate it.**
If there is nothing to commit and `HEAD` already matches `origin/main`, say so and exit 0 without
creating a commit or triggering a production build. Keep an `--allow-empty` flag for the deliberate
"redeploy current HEAD" case.

**B6. Fail fast on missing prerequisites.**
`verifyMainDeployment()` throws for a missing `VERCEL_TOKEN` **only at the very end** — after the push
and after four service deploys. Check `VERCEL_TOKEN` and `.vercel/project.json` in preflight, before
anything is written.

**B7. Report the native-surface / OTA status.**
`architecture:check` reports how many native surfaces changed since the last store release, and
`ota:publish` refuses while that is non-zero. `deploy:all` should surface this in its final summary so
the operator knows whether a store build is required. **Do not auto-re-baseline it.**

**B8. Make rollback explicit.**
On failure after the push, print the exact commands to revert (`git revert <sha>` and the Vercel
rollback path). The script currently leaves the operator to figure this out mid-incident.

**B9. Tests.**
Add `scripts/tests/deploy-all.test.ts` following the repo's `tsx` convention: preflight failure blocks
the push; `--skip-preflight` bypasses but warns; manifest downgrade is refused; empty-tree exits
cleanly; missing `VERCEL_TOKEN` aborts before any git write. Chain it into `npm run test:deployment-tools`.

**B10. Document it.**
Update `docs/01-architecture/data-layers/22-scripts-and-workflows.md` (and any release runbook) with
the new flags and the preflight order.

### Constraints

- Do not weaken `assertMainBranch()`, the git-lock handling, or the post-deploy Vercel verification.
- Do not change what gets deployed or the four service targets.
- Preserve the existing `[ASOL_DEPLOY_REPORT]` protocol and the final `console.table` summary.

---

# REPORTING STANDARD

Report only what you actually ran, with literal output. Any step that cannot run here (macOS/Xcode,
real device, live credentials) must be labelled **"NOT RUN — requires <X>"**. Never infer a pass.
State explicitly whether Part A's exit criteria all pass — that is the gate for deploying.

**Do not run `deploy:all` yourself.** It commits and pushes to production `main`. Report readiness and
let the owner trigger it.
