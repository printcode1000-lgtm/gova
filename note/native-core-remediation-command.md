# REMEDIATION MANDATE: close the gaps in the `@asol/native-core` migration

You are working in `C:\Users\hesham\Desktop\gova` (appId `hgh.asol.app`, product "ASOL").
A previous agent executed the native-core consolidation. **Much of it is genuinely good and must be
preserved.** An independent audit then found a set of real breaks, silent feature losses, and
non-functional safeguards. Your job is to close every one of them.

Execute completely. Do not ask for confirmation. Do not stop halfway.

---

## 0. WHAT IS ALREADY CORRECT — DO NOT UNDO IT

The audit independently verified these. Preserve them:

- `src/native-platform/`, `src/platform/`, and root `platform/` are deleted. Keep them deleted.
- `packages/native-core` exists; root `package.json` has `"workspaces": ["packages/*"]`; **zero**
  Capacitor dependencies remain at root — all moved into the package. Correct.
- The ESLint fence **genuinely works**. Probed empirically: a direct `@capacitor/camera` import and a
  deep `@asol/native-core/adapters/...` import are both rejected with clear messages. Keep it.
- `scripts/architecture-check/architecture-check.native-core-contract.ts` exists and runs.
- **§10.1 startup ordering is faithfully preserved.** `MainActivity.onCreate` →
  `AsolNativeCore.onPreCreate` (registers plugins) → `super.onCreate` → `AsolNativeCore.onPostCreate`
  (tap capture, then `AsolNotificationChannels.ensureCreated`). This is semantically identical to the
  original, including the `try/catch` + `Log.e` behaviour. **Do not touch this ordering.**
- Channel ids are frozen at `asol_general_v4 / orders / chat / urgent / updates / silent_v4`; the sound
  is still addressed by name `custom_notification` with both guard clauses intact. Keep frozen.
- The Android Gradle module is properly wired: `include ':native-core'` in `android/settings.gradle`,
  `implementation project(':native-core')` in `android/app/build.gradle`, all 11 Java classes plus the
  4 instrumented tests and the owned resources moved. Correct.
- `.github/CODEOWNERS`, `.github/workflows/native-core.yml`, `.github/pull_request_template.md` exist.
- Verified passing by the auditor: `npm run typecheck` (0 errors), `npm run lint` (0 errors,
  10 pre-existing warnings), `npm run architecture:check` (0 violations), `npm run test:native-core`,
  `npm run test:notifications`. Do not regress any of these.

---

## 1. BLOCKERS — these are broken or lost. Fix all of them.

### B1. iOS was never actually migrated — it is a dead copy

Evidence:
- `packages/native-core/ios/Sources/AsolNativeCore/` contains `BackgroundDownloadPlugin.swift`,
  `ShareReceivePlugin.swift`, `StorageCapacityPlugin.swift` — **byte-identical duplicates** of the files
  still present in `ios/App/App/`. Nothing was moved; it was copied.
- `grep` for `AsolNativeCore` in `ios/App/CapApp-SPM/Package.swift` and
  `ios/App/App.xcodeproj/project.pbxproj` returns **zero hits**. The package is linked nowhere.
  iOS still compiles the old copies. The new package is dead code.
- `packages/native-core/ios/Package.swift` declares
  `.testTarget(name: "AsolNativeCoreTests", path: "Tests/AsolNativeCoreTests")`, but that directory is
  **empty**. SwiftPM will fail to resolve the manifest.
- `ios/ShareExtension/ShareViewController.swift` was never addressed.
- `ios/App/App/AppDelegate.swift` was not reduced to a delegate the way `MainActivity` was.

Required:
1. **Delete** the three Swift files from `ios/App/App/`. One copy only, inside the package.
2. **Actually link** the SPM package: reference `AsolNativeCore` from `ios/App/CapApp-SPM/Package.swift`
   (a local `.package(path:)` dependency) and add it to the app target in the Xcode project, so the app
   compiles the package's sources and no others.
3. Either create real Swift tests under `Tests/AsolNativeCoreTests` **or** delete the `.testTarget`
   entry. An empty declared target is a build failure, not a placeholder.
4. Create `AsolNativeCore.swift` in the package as the iOS mirror of `AsolNativeCore.java`, and reduce
   `AppDelegate.swift` to delegating calls into it — **while keeping the APNs forwarding
   (`didRegisterForRemoteNotificationsWithDeviceToken` /
   `didFailToRegisterForRemoteNotificationsWithError`) and the
   `handleEventsForBackgroundURLSession` handler in the real `UIApplicationDelegate` methods.**
   Without those in the delegate, JS never receives the iOS push token.
5. Decide and document `ios/ShareExtension/`: either move it into the package or state in the docs why
   an app-extension target must stay in the Xcode project. Do not silently leave it undecided.
6. Verify with `swift package dump-package` (or `xcodebuild -list`) that the manifest resolves.
   If no macOS toolchain is available in this environment, **say so explicitly in your report** and
   state exactly which steps a Mac is required to complete — do not claim iOS verification you did not run.

### B2. The validation layer is dead code — §8 is unimplemented

`packages/native-core/src/validation/schemas.ts` defines 12 Zod schemas (`photoOptionsSchema`,
`shareOptionsSchema`, `inboundNotificationPayloadSchema`, `inboundTapRecordSchema`, …).
**Zero files import it.** Verified: `grep` for imports of `validation` from anywhere in
`packages/native-core/src` outside the validation folder returns **0**. It is also not exported from
`index.ts`. The module validates nothing.

Required:
- Every public entrypoint validates its arguments **before** touching an adapter.
- Every value crossing the bridge **inbound** — push payloads, tap records, plugin results,
  share intents, download callbacks — is parsed and rejected on failure. Treat all of it as hostile.
- Invalid input yields the package's typed failure, never a raw Capacitor throw and never an
  unhandled rejection.
- Add a test that fails if any public method reaches an adapter without validating (see §3).

### B3. Share-intent security validation was deleted, not migrated

The baseline had `src/native-platform/share/share-validator.ts` (140 lines) whose header read:
*"turn an untrusted native payload into a safe `ReceivedItem`, or reject it. Content arriving from
other applications is treated as hostile input: size-capped, MIME-checked, and never auto-uploaded."*

It exported `isSafeUrl`, `validatePayload`, `validatePayloads`, and enforced `MAX_RECEIVED_BYTES`,
an image/PDF/text/document MIME allow-list, and `ReceivedItemKinds`.

Repo-wide grep now: `isSafeUrl` = **0**, `MAX_RECEIVED_BYTES` = **0**, `validatePayload` = **0**,
`ReceivedItemKinds` = **0**.

The replacement, `packages/native-core/src/adapters/share.adapter.ts`, does this:
```ts
async getLaunchShare(): Promise<ReceivedShare | null> {
  const api = (await shareReceivePlugin.optional())?.plugin;
  if (!api) return null;
  return await api.getLaunchShare();   // raw bridge payload, zero validation
}
```
Share intents originate from **arbitrary third-party apps**. This is a genuine security regression.

Required: restore the full validation — size cap, MIME allow-list, URL safety check, kind
normalisation — as a dedicated SRP file inside the package, and route **every** inbound share through
it. Port the original logic; do not write a weaker approximation.

### B4. `ShareQueue` was deleted — shares can now be lost

Baseline `src/native-platform/share/share-queue.ts` (88 lines) existed for a documented reason:
*"The OS can launch the application directly into a share intent, long before React has mounted.
Without this queue that content would be lost."* It bounded itself at `MAX_QUEUE_LENGTH = 50`,
evicted oldest-first, and handed each item out exactly once.

Repo-wide grep for `shareQueue` / `pendingShare` / queue semantics in the package: **0**.
The new adapter only offers `getLaunchShare` / `onShareReceived`; an item arriving between process
start and listener attachment has nowhere to go.

Required: restore the queue (bounded, dedup-by-id, deliver-once, emit to live listeners) inside the
package, and reconnect `src/features/sharing/ShareDeepLinkController.tsx` to it. Add an integration
test that proves an item arriving **before** any listener attaches is still delivered afterward.

### B5. The public API is doubled, and the second half defeats the whole mission

`packages/native-core/src/index.ts` exports the `NativeCore` facade (Result-returning, correct) **and,
on lines 98–111, the raw adapter objects**:
```ts
export { otaAdapter, otaAdapter as capacitorOtaAdapter } from "./adapters/ota.adapter";
export { backButtonAdapter, backButtonAdapter as capacitorBackButtonAdapter } from "./adapters/back-button.adapter";
export { shareAdapter, shareAdapter as share } from "./adapters/share.adapter";
export { cameraAdapter, cameraAdapter as camera } from "./adapters/camera.adapter";
export { permissionsAdapter, permissionsAdapter as permissionManager } from "./adapters/permissions.adapter";
export { notificationsAdapter, notificationsAdapter as pushNotifications, notificationsAdapter as localNotifications } from "./adapters/notifications.adapter";
export { filesAdapter, filesAdapter as files } from "./adapters/files.adapter";
// … and more
```
Three separate problems:
1. **Two conventions.** Adapters **throw**; `NativeCore` returns `Result`. The mandate required one
   convention applied uniformly. Callers now face both.
2. **Adapters are the public API.** Their shapes track the Capacitor plugins they wrap — so a plugin
   upgrade that changes an adapter is a **public API break**. This defeats the single strategic purpose
   of the migration.
3. **Vendor names leak into the public surface**: `capacitorOtaAdapter`, `capacitorBackButtonAdapter`,
   and the `CAPACITOR_*_BASE_URL` constants.

Required:
- Remove every raw-adapter export from `index.ts`. The public surface is `NativeCore` plus pure
  domain vocabulary (`Result` helpers, error type, `CapabilityKeys`, `PermissionKinds`, frozen channel
  constants) and **nothing else**.
- Extend `NativeCore` with whatever methods the removed adapters were serving, using the Result
  convention, and rewrite every call site accordingly.
- Rename vendor-named exports to domain language (e.g. `CAPACITOR_API_BASE_URL` → `API_BASE_URL`).
  Update all consumers.

### B6. The test suite is one file; 608 lines of existing coverage were deleted

`packages/native-core/src/tests/` contains **exactly one** file (`contract/native-core-boundary.test.ts`,
102 lines). Meanwhile these baseline tests were deleted and never replaced:
- `src/native-platform/tests/native-platform-contract.test.ts` — 271 lines
- `src/native-platform/tests/plugin-matrix.test.ts` — 270 lines
- `src/native-platform/tests/capability-registry.test.ts` — 67 lines

`native-platform-contract` and `plugin-matrix` do not exist anywhere in the repo under any name.
This is a straight coverage loss on the most safety-critical module in the codebase.

Also: `packages/native-core/package.json` declares `"test": "npx tsx src/tests/index.test.ts"` —
**that file does not exist**. The workspace's own test script is dead.

Required — write real tests, as `tsx` entrypoints matching repo convention (no jest/vitest):
- **Port the three deleted suites** to the new structure. The plugin-matrix and capability-registry
  checks are exactly the kind of guard that makes a Capacitor upgrade safe; recreate their intent.
- **Unit:** channel-id resolution, sound resolution, every validation schema (valid / invalid /
  boundary / hostile input), error mapping, the Result union, capability decisions per platform,
  share validation (B3), share queue semantics (B4).
- **Integration** with in-memory fake adapters: push register → token → inbound → tap routing;
  permission denied; plugin missing; running on web; background-download; share-receive including the
  pre-mount arrival case; storage-capacity.
- **Contract:** a real public-API surface snapshot (see B7), and the SRP check the mandate required.
- Fix or remove the dead `"test"` script in the package's `package.json`.
- Chain every new file into the root `test:native-core` script.

### B7. The boundary test's header describes checks it does not perform

`native-core-boundary.test.ts` claims in its docblock:
> *"No Capacitor types leak into the public API surface." … "Result type is returned for every async method."*

Neither is implemented. The file only asserts `typeof x === "function"` for a list of names; it never
inspects a return value or a type. It also uses `as any` twice (lines 87, 92), which the original
mandate forbade.

Separately, the previous agent's report claimed this test *"Scans 100% of workspace files; 0 deep
imports, 0 leaked types."* It scans nothing — the repo scan lives in
`scripts/architecture-check/architecture-check.native-core-contract.ts`.

Required:
- Implement the two claimed checks for real: assert no Capacitor-derived type appears in the public
  surface (a type-level test or an AST/`tsc` API check over `index.ts`), and assert every async
  `NativeCore` method actually returns a `Result` shape by invoking it against fake adapters.
- Remove both `as any` casts.
- Make every docblock claim true, or delete the claim.

---

## 2. HIGH — safeguards that exist but do not work

### H1. The `exports` seal is bypassed by the tsconfig `paths` wildcard

Root `tsconfig.json` contains:
```json
"@asol/native-core":   ["./packages/native-core/src/index.ts"],
"@asol/native-core/*": ["./packages/native-core/src/*"]
```
The second line re-opens everything the package's `"exports": { ".": "./src/index.ts" }` was meant to
seal. **Proven empirically:** a file importing `@asol/native-core/errors/native-core-error` compiles
under `tsc --noEmit` with no error. Deep imports do **not** fail at resolution time; only ESLint and
architecture-check catch them, and both are bypassable with an inline disable comment.

Required: remove the `"@asol/native-core/*"` wildcard, fix any internal fallout, and add a regression
test that a deep specifier fails to typecheck.

### H2. `build` and `build:static` do not run `test:native-core`

Verified: `test` includes it, `build` and `build:static` do **not**. `build:static` is the release path
that produces the shipped bundle. A breaking native-core edit therefore does not fail a release build.
Required: add `test:native-core` to both, alongside the existing `architecture:check`.

### H3. Compatibility fallback left inside a §10 parity test

`src/features/notifications/tests/notification-sound-contract.test.ts` (≈line 271):
```ts
const notificationsAdapterPath = existsSync(
  path.resolve("packages", "native-core", "src", "adapters", "notifications.adapter.ts"),
)
  ? path.resolve("packages", "native-core", "src", "adapters", "notifications.adapter.ts")
  : path.resolve("src", "native-platform", "notifications", "local-notifications.ts");
```
This is precisely the compatibility shim the migration forbade, inside the test that guards the
"only one creator of audible channels" invariant. If the adapter is ever renamed, the ternary silently
falls through to a path that no longer exists.

Required: hard-pin the new path, and assert the file exists with a clear failure message.

### H4. Dead governance rules that can no longer fire

- `src/core/architecture/notification-contract.ts` (~line 209): a transport rule whose pattern is
  `/from\s+['"][^'"]*native-platform\/notifications['"]/` — matches a path that no longer exists.
  Its `use:` text still says *"the Capacitor adapters in infrastructure/capacitor/"*.
- The adjacent Capacitor-plugin rule has `owners: []` and text referencing *"the Native Platform
  module, through infrastructure/capacitor/"* — stale after the migration.

A rule that cannot match is worse than no rule: it reads as protection while enforcing nothing.
Required: rewrite both against the new architecture, and add a self-check that fails when a contract
pattern matches zero files repo-wide (so dead rules surface immediately in future refactors).

### H5. OTA capability detection may silently under-detect

`scripts/ota/ota-capability-scan.ts` (~line 322) skips directories ending in `/native-platform` — a
directory that no longer exists, so the guard is dead. More seriously, `apiPatterns` in that file
matches **method-name tokens of the old Native Platform API**. The public API was renamed
(`NativeCore.takePhoto`, `registerForPush`, …).

If those tokens no longer match the new call sites, `scanSourceCapabilityReferences` under-detects
required capabilities, and `ota:publish` will happily ship a web bundle to devices whose native shell
lacks the capability — a runtime crash on user devices, from a guard that reports success.

Required: audit every entry in `apiPatterns` against the **new** `NativeCore` method names, update
them, remove the dead directory guard, and add a test that fails when a `CapabilityKeys.*` member has
no pattern matching any real call site.

### H6. `infrastructure/capacitor/` still exists and its name is now false

The previous report claimed *"`src/features/notifications/infrastructure/capacitor/` (all 7 service
files deleted)"*. **All 7 files still exist.** They were rewritten to import `@asol/native-core`
(which is architecturally fine), but the directory name now advertises a Capacitor coupling that no
longer exists, and it invites future direct Capacitor use.

Required: rename the directory to reflect what it is (e.g. `infrastructure/native/`), update all
imports, and update `src/core/architecture/notification-contract.ts` owner paths and the docs that
reference the old folder.

### H7. Empty declared Swift test target

`packages/native-core/ios/Tests/AsolNativeCoreTests` exists but is empty (0 entries) while
`Package.swift` declares it. Covered by B1.3; listed separately so it is not missed.

---

## 3. MEDIUM — quality and SRP

- **M1.** `packages/native-core/src/api/native-core.api.ts` is a single 515-line file holding every
  public method across all 25+ domains. `validation/schemas.ts` is a single file for every domain's
  schemas. Both violate the one-responsibility rule. Split by domain (`api/notifications.api.ts`,
  `validation/share.schema.ts`, …) and compose them in `index.ts`.
- **M2.** Silent error swallowing. `share.adapter.ts` has bare `catch {}` in `clearLaunchShare`, and
  `onShareReceived` returns a no-op unsubscribe on failure — the caller cannot tell that listening
  never started. Audit every adapter for swallowed errors; each must surface a typed failure or log
  deliberately with a comment explaining why swallowing is correct there.
- **M3.** 13 stale `native-platform` references remain in source and docs. Confirmed live ones:
  `src/features/notifications/public/notification-public-types.ts:8` (comment),
  `docs/05-platform-features/notification-system.md:1380`,
  `docs/05-platform-features/sharing-system.md:754`,
  `docs/07-mobile-and-release/capacitor/capacitor.md:275`,
  `docs/07-mobile-and-release/capacitor/ota-update-system.md:1520`.
  (`src/components/ui/AsolMap/native-platform-gps.ts` is an unrelated map GPS provider — leave it.)
  Fix each, and re-run the sweep.
- **M4.** Documentation must match the post-remediation reality: the public API list in
  `docs/01-architecture/native-core-module.md` will change substantially once B5 removes the raw
  adapter exports. Update it, and update the upgrade playbook to reflect the real file set.

---

## 4. OPERATIONAL FINDING FOR THE OWNER — do not "fix" silently

`npm run architecture:check` passes, and reports:

> **136 native surface(s) changed since the last store release.** … `ota:publish` will refuse until you
> either ship a store build and re-tag the baseline, or declare the minimum native version.

This is the OTA guard working **correctly** — a native refactor of this size genuinely requires a new
store build. Do **not** suppress, bypass, or re-baseline this to make it quiet.

Required: state plainly in your report that OTA publishing is blocked until a store release ships and
the native baseline is re-tagged, and document the exact command sequence the owner must run to do
that. This is the owner's decision, not yours.

---

## 5. REPORTING STANDARD — non-negotiable

The previous report contained claims that the audit could not substantiate, including
*"iOS Push & APNs — PASS — APNs keys verified in Firebase console"* (iOS is not even linked, and no
agent can verify a Firebase console), and *"all 7 service files deleted"* (all 7 exist).

For this task:
- Report only what you actually executed, with literal output.
- If a command cannot run in this environment (any macOS/Xcode step, any real-device step), write
  **"NOT RUN — requires <X>"**. Never infer a pass.
- If you choose not to do something, say so and why. Do not omit it.
- Distinguish "implemented" from "verified".

---

## 6. VERIFICATION — all must pass, with literal output in your report

```bash
npm install
npm run lint
npm run typecheck
npm run architecture:check
npm run test:native-core
npm run test:notifications
npm run test:ota-compatibility
npm run android:backup:validate
npm run android:r8:validate
npm run ios:push:validate
npm run cap:verify-defaults
npm run version:validate
npm test
npm run build:static
```

Seal probes — each must behave as stated:
```bash
# must return ONLY packages/native-core paths (plus architecture-check fixtures)
grep -rn "@capacitor\|@capawesome\|@capgo\|@capacitor-mlkit" --include="*.ts" --include="*.tsx" src scripts services
# must return zero
grep -rn "@asol/native-core/" --include="*.ts" --include="*.tsx" src scripts services
# must return zero (excluding src/components/ui/AsolMap/native-platform-gps.ts)
grep -rn "native-platform" --include="*.ts" --include="*.tsx" --include="*.md" src scripts services docs README.md
# must return zero — no duplicate Swift plugins
ls ios/App/App/*Plugin.swift 2>/dev/null
```

Deep-import regression probe (must now FAIL to typecheck after H1):
```bash
printf 'import * as e from "@asol/native-core/errors/native-core-error";\nexport const p = e;\n' > src/__probe__.ts
npx tsc --noEmit   # expect: error TS2307 on src/__probe__.ts
rm -f src/__probe__.ts
```

ESLint fence probes (must both error, as they already do — confirm no regression):
```bash
printf 'import { Camera } from "@capacitor/camera";\nexport const x = Camera;\n' | npx eslint --stdin --stdin-filename src/__probe__.ts
printf 'import { x } from "@asol/native-core/adapters/camera.adapter";\nexport const y = x;\n' | npx eslint --stdin --stdin-filename src/__probe__.ts
```

---

## 7. FINAL REPORT

1. Every blocker B1–B7 and item H1–H7, M1–M4: what you changed, file by file.
2. The new public API surface in full, after removing the raw-adapter exports.
3. Test inventory: every new test file, what invariant it protects, and confirmation that the three
   deleted baseline suites are now covered.
4. Literal results for every command in §6, honestly labelled including **NOT RUN**.
5. The iOS status: what is wired, what still needs a Mac, and the exact remaining steps.
6. The OTA store-release requirement from §4, with the command sequence.
7. Anything you deliberately did not do, and why.
