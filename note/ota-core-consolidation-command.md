# BINDING SPECIFICATION: `packages/ota-core`

Repository: `C:\Users\hesham\Desktop\gova` (appId `hgh.asol.app`, "ASOL").

This is a **specification, not a brief**. Names, paths, signatures, and script names below are
**decided**. Do not redesign them. Do not substitute your own naming. Do not "improve" the structure.
Where this document names a file, create that exact file. Where it names an export, create that exact
export. If something here is genuinely impossible, stop and report it under §12 — do not silently
choose an alternative.

Execute all of §6 in order. Do not stop halfway. Do not ask for confirmation.

---

## 1. PROHIBITED — every item below was an actual defect in the previous migration of this repo

These are not hypothetical. Each was found by audit in the `native-core` migration. Repeating any of
them fails this task.

1. **Never claim a file was deleted, moved, or changed without verifying it.** The previous report said
   "all 7 service files deleted" while all 7 still existed. Every claim in your report must be backed by
   a command in §11 whose literal output you paste.
2. **Never claim a verification you did not run.** The previous report said "APNs keys verified in
   Firebase Console" — impossible for an agent. Anything you did not execute is
   **"NOT RUN — requires <X>"**.
3. **Never write a docblock describing a check you did not implement.** The previous boundary test's
   header claimed "no Capacitor types leak" and "Result returned for every async method"; it
   implemented neither. Every sentence in a docblock must be true of the code beneath it.
4. **Never copy a file to a new location and leave the original.** The previous migration duplicated
   three Swift plugins byte-for-byte in two places and wired neither. Moving means the old path is gone.
5. **Never leave a `existsSync(new) ? new : old` fallback.** Three of these were left behind and had to
   be removed. Pin the new path and assert it exists with a clear message.
6. **Never add an enforcement rule without migrating the code it forbids.** The previous migration added
   a `navigator.clipboard` ban and a notification-boundary rule, then left 4 violating call sites — which
   broke `npm run build`. If you add a rule, fix every file it flags **in the same change**.
7. **Never assert against a symbol without checking it exists.** The previous boundary test asserted
   `otaGetCurrentVersion`, `otaReset`, `otaDownload` — none existed. Before asserting a name, grep for it.
8. **Never point a script at a file that does not exist.** The previous `package.json` had
   `"test": "npx tsx src/tests/index.test.ts"` for a file that was never created.
9. **Never declare an empty target.** A `.testTarget` was declared for an empty directory, making the
   Swift package unresolvable.
10. **Never delete a capability key, contract rule, or test assertion to make a check pass.** A failing
    check is evidence of a real defect. Fix the defect. The previous migration lost the `openExternally`
    feature entirely, and the capability scanner correctly caught it.
11. **Never leave a rule that can no longer match anything.** A dead contract rule reads as protection
    while enforcing nothing.
12. **Never use `any`, `@ts-ignore`, or `eslint-disable` to make the cutover compile.**

---

## 2. ALREADY DECIDED — do not redesign these

The repository was audited before this spec was written. The logic below **already exists and is
correct**. Your job is to move it, not to rewrite it. Keep the existing comments; update only what the
new location requires.

### 2.1 The version scheme is already implemented
`src/modules/release-commands/domain/content-version.ts` already implements the required design:
shell `0.2.3` carries content `0.2.3.0`; each OTA advances the counter (`0.2.3.1`, `0.2.3.2`); the next
shell opens `0.2.4.0` and restarts the counter; `compareOtaVersions` orders by the native triple first
so `0.2.4.0` outranks `0.2.3.9`.

Read that file's header comment before touching it. The ordering is load-bearing: each device runs the
comparison that shipped **inside its own bundle**, so a version that fails to advance is read as "no
update" and cannot be fixed by the update being rejected. `assertContentVersionAdvances` exists for
that reason. Move it intact.

### 2.2 Version writing is already automated
`scripts/cap-build.ts` already writes `android/app/build.gradle` (`versionName` + derived `versionCode`),
`ios/App/App.xcodeproj/project.pbxproj` (`MARKETING_VERSION`, `CURRENT_PROJECT_VERSION`),
`src/core/config/app-version.ts`, and `.env.example`. `nextNativePatchVersion` in
`scripts/ota/ota-native-compatibility.ts` computes the next shell version. Move these. Write no second
version writer.

### 2.3 A Google Play API client already exists in TypeScript
`src/modules/google-play-console/services/google-play-console-service.server.ts` already calls
`https://androidpublisher.googleapis.com/androidpublisher/v3`, and
`google-play-credentials.server.ts` already resolves credentials from
`GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_BASE64` (verified working — `npm run fastlane:android:doctor` passes).
**Do not shell out to fastlane to read versions. Do not write a second Play client.** See §6 step 8.

### 2.4 R2 truth reading already exists
`scripts/ota-status.ts` + `scripts/ota/ota-r2.ts` read the live `app-updates/manifest.json`, and
`ota-publish.ts` already feeds that version into `nextContentVersion` as `previous`. Move it.

### 2.5 The native-change gate already exists
`scripts/ota/ota-native-compatibility.ts` (`resolveNativeBaseline`, `inspectNativeCompatibility`,
`requiresStoreRelease`) detects native drift against the newest `native-v*` tag. Its logic is fine. Its
defect is that **six callers each interpret it separately** — that is the duplication you remove.

---

## 3. EXACT PACKAGE STRUCTURE

Create exactly this. Add files only where this spec's content requires them; do not invent extra layers.

```
packages/ota-core/
  package.json
  tsconfig.json
  README.md
  scripts/
    build-out.ts                 # entry for npm run build:static
    ota-publish.ts               # entry for npm run ota:publish
    ota-status.ts                # entry for npm run ota:status
    ota-keygen.ts                # entry for npm run ota:keygen
    ota-revoke.ts                # entry for npm run ota:revoke
    ota-self-test.ts             # entry for npm run ota:self-test
    ota-mirror-legacy.ts         # entry for npm run ota:mirror-legacy
    serve-static.ts              # entry for npm run serve:out
    validate-app-versions.ts     # entry for npm run version:validate
  src/
    index.ts                     # RUNTIME entry (browser-safe)
    publishing.ts                # PUBLISHING entry (node-only)
    domain/
      versioning/
        content-version.ts       # moved from src/modules/release-commands/domain/
        native-version.ts        # nextNativePatchVersion + versionCode derivation
        version-ordering.ts      # compareOtaVersions and friends
      release/
        manifest-types.ts
        signature-payload.ts
        canonical-order.ts
        delta-plan.ts
        release-diff.ts
        rollout.ts
        adoption.ts
        revocation-document.ts
        revocation-state.ts
        capability-gate.ts
        bundle.ts
        stale-file-error.ts
        ota-state.ts
    runtime/
      update-service.ts
      revocation-service.ts
      outcome-logger.ts
      api-service.ts
      release-service.server.ts
      use-ota-update.tsx
    publishing/
      gate/
        native-gate.ts           # THE single decision point
        gate-report.ts           # the one formatter for native-surface reporting
      versioning/
        version-reader.ts        # read current native + content versions from the tree
        version-writer.ts        # write gradle, pbxproj, app-version.ts, .env.example
      truth/
        live-ota-release.ts      # R2 manifest truth
        live-play-release.ts     # Google Play track truth
      build/
        build-out.ts             # the complete `out` pipeline orchestrator
        out-runtime-config.ts    # from build-static.runtime-config.ts
        out-file-operations.ts   # from build-static.file-operations.ts
        out-public-assets.ts     # from build-static.public-assets.ts
        release-bundle-guard.ts  # from assert-release-static-bundle.ts
        release-manifest-guard.ts# manifest-downgrade guard, moved out of deploy-all.ts
      release/
        publish-release.ts
        manifest-assembly.ts
        history.ts
        revocation.ts
        live-revocation.ts
        mirror-legacy-manifest.ts
        capability-scan.ts
      adapters/                  # ONLY place for @aws-sdk/*, google-auth-library, node:fs, node:child_process
        r2-storage.adapter.ts
        google-play.adapter.ts
        filesystem.adapter.ts
        process.adapter.ts
      config/
        ota-config.ts
    validation/
      schemas.ts
    errors/
      ota-core-error.ts
      result.ts
    tests/
      unit/
      integration/
      contract/
      index.test.ts              # master runner; must import every test file below it
```

**`packages/ota-core/package.json` — exactly these exports, no wildcard:**
```json
{
  "name": "@asol/ota-core",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./publishing": "./src/publishing.ts"
  }
}
```

**Root `tsconfig.json` paths — add exactly these two, no wildcard entry:**
```json
"@asol/ota-core": ["./packages/ota-core/src/index.ts"],
"@asol/ota-core/publishing": ["./packages/ota-core/src/publishing.ts"]
```
A `"@asol/ota-core/*"` wildcard is forbidden — it silently defeats the `exports` seal, exactly as it did
for `@asol/native-core` before it was removed.

---

## 4. THE TWO ENTRY POINTS

| Entry | Runs where | May import |
| :-- | :-- | :-- |
| `@asol/ota-core` | Browser + SSR. Consumers: `src/app/layout.tsx`, `src/components/splash/SplashInitializer.tsx`, `src/components/settings/SettingsPageContent.tsx`, `src/app/api/ota/**`, `src/modules/google-play-console/**`, `src/modules/release-commands/**`, `src/modules/data-access/domains/ota/**` | Pure TS, `@asol/native-core`. **Zero node builtins.** |
| `@asol/ota-core/publishing` | Node scripts only | Everything, including `@aws-sdk/*`, `google-auth-library`, `node:fs`, `node:child_process` |

If publishing code becomes reachable from the runtime entry, `@aws-sdk/client-s3` and the Google Play
credential path get bundled into the shipped web bundle. §10 requires a contract test that fails on this.

---

## 5. EXACT PUBLIC API — `@asol/ota-core/publishing`

Implement these exact names and shapes. Every function returns
`{ ok: true; value: T } | { ok: false; error: OtaCoreError }` — uniformly, no exceptions, no mixed
conventions. `OtaCoreError` carries a string `code`.

```ts
// ── Truth: what is actually live right now ────────────────────────────────
export function readCurrentVersions(): Promise<Result<CurrentVersions>>;
//   { nativeVersion: "0.2.4", contentVersion: "0.2.4.0", androidVersionCode: number }
//   Read from the working tree (build.gradle is authoritative for nativeVersion).

export function readLiveOtaRelease(): Promise<Result<LiveOtaRelease | null>>;
//   Read-only GET of app-updates/manifest.json from R2. null when none is published.
//   { version, releaseId, minimumNativeVersion, publishedAt }

export function readLivePlayRelease(track: string): Promise<Result<LivePlayRelease | null>>;
//   Live version codes on a Google Play track, via §6 step 8. null when the track has no release.
//   { track, versionCodes: number[], highestVersionCode: number }

// ── The gate ──────────────────────────────────────────────────────────────
export function evaluateReleaseGate(): Promise<Result<GateDecision>>;
//   GateDecision =
//     | { state: "open"; nativeVersion: string; baseline: string }
//     | { state: "blocked"; nativeVersion: string; baseline: string;
//         changedPaths: string[]; changedNativeDependencies: string[]; reason: string }
//     | { state: "unprovable"; reason: string }   // no native-v* baseline resolvable
//   "blocked" must name BOTH ways out in `reason`:
//     (a) cut and publish a new native release, or (b) revert native to the baseline.

// ── Job 1: local refresh (TEST intent) ────────────────────────────────────
export function runLocalRefresh(options: {
  capSync: boolean;
}): Promise<Result<LocalRefreshReport>>;
//   Requires gate "open". Builds `out` at the CURRENT content version — no bump.
//   Uploads nothing. Contacts R2 only if `readLiveOtaRelease` is needed for reporting.
//   When capSync is true, runs the existing cap sync pipeline.

// ── Job 2: publish an OTA (PUBLISH intent) ────────────────────────────────
export function publishOtaRelease(options: {
  confirmUpload: true;          // §7. Absent or false => refuse before building.
  notes?: string;
  dryRun?: boolean;             // run the gate and version derivation, upload nothing
}): Promise<Result<PublishReport>>;
//   Requires gate "open". Advances the counter exactly one step on the current native line,
//   using readLiveOtaRelease() as `previous`. Builds `out`. Uploads. Manifest written LAST.

// ── Cutting a new native release (resets the counter) ─────────────────────
export function cutNativeRelease(options: {
  confirmVersionWrite: true;    // §7
  confirmTagPush?: boolean;     // §7 — creating/pushing native-v* requires this
}): Promise<Result<NativeReleaseReport>>;
//   Computes the next native version, writes it to gradle + pbxproj + app-version.ts + .env.example,
//   sets the content version to `<native>.0`, and builds `out` for inclusion in the shell.
//   Publishes nothing to R2 — the shell carries its own content.

// ── Shared guards used by other scripts ───────────────────────────────────
export function assertReleaseStaticBundle(manifestPath?: string): void;
export function assertReleaseManifestNotDowngraded(options: { allowDowngrade: boolean }): void;
export function formatNativeSurfaceReport(decision: GateDecision): string;
```

Additional required exports, moved not rewritten: `nextContentVersion`, `releaseContentVersion`,
`parseContentVersion`, `assertNativeVersion`, `assertContentVersionAdvances`, `compareOtaVersions`,
`nextNativePatchVersion`, `androidVersionCodeFor(nativeVersion)`.

No vendor names in any exported identifier: no `r2`, `s3`, `aws`, `androidpublisher`, `fastlane`.

**Runtime entry (`@asol/ota-core`)**: re-export exactly what the current consumers of
`src/features/ota/**` and `content-version.ts` use — no more. List the final surface in your report.

---

## 6. ORDERED TASK LIST — execute in this order

**Step 1 — Create the package skeleton.** Exact structure from §3. Add `packages/ota-core` under the
existing `"workspaces": ["packages/*"]`. Add the two `tsconfig` paths.

**Step 2 — Move the runtime half.** All of `src/features/ota/**` → `packages/ota-core/src/runtime/` and
`src/domain/release/` per §3. Delete `src/features/ota/`. Rewrite every importer:
`src/app/layout.tsx`, `src/components/splash/SplashInitializer.tsx`,
`src/components/settings/SettingsPageContent.tsx`, `src/app/api/ota/access/route.ts`,
`src/app/api/ota/admin/releases/route.ts`, `src/app/api/ota/admin/releases/diff/route.ts`,
`src/modules/data-access/domains/ota/repositories/ota-release-repository.ts`,
`src/modules/google-play-console/hooks/use-ota-admin.ts`,
`src/modules/google-play-console/presentation/components/OtaReleaseChanges.tsx`.

**Step 3 — Move version derivation.** `src/modules/release-commands/domain/content-version.ts` →
`packages/ota-core/src/domain/versioning/content-version.ts`. Delete the original. Re-point:
`src/modules/google-play-console/presentation/components/ReleaseVersionSummary.tsx`,
`src/modules/release-commands/tests/release-commands.test.ts`, `scripts/validate-app-versions.ts`.

**Step 4 — Move the publishing tooling.** All of `scripts/ota/` plus `scripts/ota-publish.ts`,
`scripts/ota-publish/`, `scripts/ota-keygen.ts`, `scripts/ota-status.ts`, `scripts/ota-self-test.ts`,
`scripts/test-ota-native-compatibility.ts`, `scripts/test-ota-r2-retry.ts`. Delete `scripts/ota/` and
`scripts/ota-publish/` entirely. Move `scripts/ota/ota-revocations.json` with its reader.

**Step 5 — Move the `out` pipeline.** `scripts/build-static.ts`, all of `scripts/build-static/`,
`scripts/serve-static.ts`, `scripts/assert-release-static-bundle.ts` → §3 locations. Delete the
originals and the `scripts/build-static/` directory.
`packages/ota-core/scripts/build-out.ts` orchestrates the full pipeline that the `build:static` npm
script currently chains by hand: `branding:generate`, `catalog:validate`, `test:catalog-studio`,
`architecture:check`, the notification service-source sync, `test:notifications`, `test:native-core`,
`test:ota-core`, then the Next build, then the audits.
**Invoke those steps; do not absorb branding, catalog, or notification logic into this package.**

**Step 6 — Move version writing out of `cap-build.ts`.** The gradle/pbxproj/`app-version.ts`/`.env.example`
writers → `publishing/versioning/version-writer.ts`. `scripts/cap-build.ts` keeps orchestration and calls
`@asol/ota-core/publishing` for every number. `src/core/config/app-version.ts` stays a generated
constants file with `ota-core` as its only writer.

**Step 7 — Build the single gate.** `publishing/gate/native-gate.ts` exports `evaluateReleaseGate()`.
Rewrite all six current interpreters to call it: `scripts/architecture-check.ts`,
`scripts/architecture-check/architecture-check.file-analysis.ts`,
`scripts/architecture-check/architecture-check.native-contract.ts`, `scripts/deploy-all.ts`,
the publish path, and the compatibility test.
`architecture:check` keeps printing the report and **keeps not failing** on native drift — it is a repo
report, not a release gate. Turning it into a gate would block ordinary development. The **refusal**
lives only in `publishOtaRelease` and `runLocalRefresh`.

**Step 8 — Google Play truth without duplication.** Move `resolveGooglePlayCredentials` from
`src/modules/google-play-console/services/google-play-credentials.server.ts` into
`packages/ota-core/src/publishing/adapters/google-play.adapter.ts`, **dropping `import "server-only"`**
so Node scripts can use it. Add `readLiveTrackVersionCodes(track)` there. Then rewrite
`google-play-credentials.server.ts` to re-export from `@asol/ota-core/publishing` — or delete it and
re-point `google-play-console-service.server.ts` and `google-play-store-assets-service.server.ts`
directly. Exactly one credential resolver survives repo-wide.

**Step 9 — Collapse every duplication.** Each row must end with exactly one implementation:

| Duplicated today | Action |
| :-- | :-- |
| `inspectNativeCompatibility` interpreted in 6 places (step 7) | one `evaluateReleaseGate()` |
| `compareVersions` in `scripts/deploy-all.ts` vs `compareOtaVersions` | delete the `deploy-all` copy |
| `reportNativeSurfaceStatus()` in `deploy-all.ts` vs `reportNativeSurface()` in `architecture-check.file-analysis.ts` | one `formatNativeSurfaceReport()` |
| `RELEASE_MANIFEST` downgrade guard in `deploy-all.ts` | move to `release-manifest-guard.ts` |
| `assertReleaseStaticBundle` called from `cap:sync`, `cap:copy`, publish, `cap-build` | one export |
| `versionCode` derived in `cap-build.ts` and again in `validate-app-versions.ts` | one `androidVersionCodeFor()` |

**Step 10 — npm scripts.** Apply exactly this mapping. Delete every old entry; leave no dead script.

| Script | New value |
| :-- | :-- |
| `build:static` | `npx tsx packages/ota-core/scripts/build-out.ts` |
| `serve:out`, `preview:static` | `npx tsx packages/ota-core/scripts/serve-static.ts` |
| `ota:publish` | `npx tsx packages/ota-core/scripts/ota-publish.ts` |
| `ota:check` | `npx tsx packages/ota-core/scripts/ota-publish.ts --dry-run` |
| `ota:status` | `npx tsx packages/ota-core/scripts/ota-status.ts` |
| `ota:keygen` | `npx tsx packages/ota-core/scripts/ota-keygen.ts` |
| `ota:revoke` | `npx tsx packages/ota-core/scripts/ota-revoke.ts` |
| `ota:self-test` | `npx tsx packages/ota-core/scripts/ota-self-test.ts` |
| `ota:mirror-legacy` (+ `:remove`) | `npx tsx packages/ota-core/scripts/ota-mirror-legacy.ts` |
| `version:validate` | `npx tsx packages/ota-core/scripts/validate-app-versions.ts` |
| `test:ota-core` | **new** — `npx tsx packages/ota-core/src/tests/index.test.ts` |
| `test:ota-delivery`, `test:ota-background`, `test:ota-hardening`, `test:ota-compatibility`, `test:ota-r2-retry` | **delete** — folded into `test:ota-core` |

Add `test:ota-core` to `npm test`, `build`, and `build:static`. Remove the deleted script names from the
`test` chain in the same edit — a chain referencing a deleted script breaks `npm test`.

**Step 11 — Enforcement, all four layers.**
1. `exports` per §3 (two doors, no wildcard).
2. `eslint.config.js`, following the existing `@asol/native-core` block: ban `@asol/ota-core/*` deep
   paths; ban `@aws-sdk/*` and `google-auth-library` outside
   `packages/ota-core/src/publishing/adapters/**`. **Check whether `google-auth-library` is still used by
   `src/features/notifications/services/providers/fcm-http-v1.server.ts`; if so, add that exact file as a
   narrow exception and say so in the README.** Then fix every file the new rules flag — see §1 item 6.
3. `scripts/architecture-check/architecture-check.ota-core-contract.ts`, modelled on the existing
   `architecture-check.native-core-contract.ts`, wired into `scripts/architecture-check.ts`.
4. The contract tests in §10.

**Step 12 — Governance.** Add `packages/ota-core/**` to `.github/CODEOWNERS`. Add `test:ota-core` and
`version:validate` to `.github/workflows/native-core.yml`.

**Step 13 — Documentation.** §9.

---

## 7. HUMAN CONFIRMATION FOR IRREVERSIBLE ACTS

Three acts require an explicit per-invocation flag. Never a default, never inferred. An unrecognised
flag must abort rather than be ignored. Record which confirmations were given in the run output.

| Act | Flag |
| :-- | :-- |
| Upload to R2 (an OTA reaching real devices) | `--confirm-upload` → `confirmUpload: true` |
| Write native version numbers into the tree | `--confirm-version-write` → `confirmVersionWrite: true` |
| Create or push a `native-v*` git tag | `--confirm-tag-push` → `confirmTagPush: true` |

This mirrors the preflight gate already in `scripts/deploy-all.ts`: verify before the point of no return.

---

## 8. RUNTIME INVARIANTS THAT MUST NOT REGRESS

1. **Version ordering is load-bearing.** Native triple first. Each installed bundle runs the comparison
   that shipped inside it, so a version that does not strictly advance is read as "no update" and the
   release reaches no one. `assertContentVersionAdvances` keeps refusing that case with its current text.
2. **A store release publishes nothing.** Shell `x.y.z` carries `x.y.z.0`; the first OTA on that line is
   `.1`.
3. **The signed manifest is written last.** An interrupted publish must not be live. `ota:status` stays a
   read-only GET of `app-updates/manifest.json`. These two together are the only way to tell whether an
   interrupted publish landed.
4. **Revocation drift recovery.** The publish path merges tracked revocations with the live signed
   document and warns on recovery. Dropping a revocation un-revokes a release on every device.
5. **Diagnostic bundles never reach native assets.** `assertReleaseStaticBundle` refuses a manifest with
   `diagnostic: true`, on every path that copies `out` into a native project.
6. **Capability gating.** The capability scan maps a public `NativeCore.*` method to each capability key
   and fails when a key has no pattern. It must keep failing the build, and must read `@asol/native-core`
   through its **public** entry only. Per §1 item 10, never delete a key to pass.
7. **`build:static` rewrites the release manifest.** Without the release env vars it downgrades
   `releaseId`/`version`/`minimumNativeVersion` to the `package.json` version. `ota-core` owns both the
   build and the manifest, so it owns this guard.
8. **TEST intent uploads nothing and compares nothing against R2.** Reusing the current number for a
   local rebuild is deliberate — a developer tool, not a claim that the local bundle equals what users
   have. Say so in the README so nobody later "fixes" it into a byte comparison.

---

## 9. DOCUMENTATION

**Write** `docs/01-architecture/ota-core-module.md`: the two entry points and why; the gate and its two
exits; the two intents; the version scheme with the worked example `0.2.4.0 → 0.2.4.1 → new shell →
0.2.5.0`; the §8 invariants **with their reasoning preserved**; where Play and R2 truth come from; the
§7 confirmations.

**Rewrite** (these describe moved code): `docs/07-mobile-and-release/capacitor/ota-update-system.md`,
`docs/07-mobile-and-release/capacitor/static-export-policy.md`,
`docs/07-mobile-and-release/capacitor/release-command-center.md`,
`docs/01-architecture/data-layers/16-deployment-targets.md` (the `deploy:all` section changes when the
manifest guard and native-surface report move out),
`docs/01-architecture/data-layers/22-scripts-and-workflows.md` (script names changed),
`docs/08-troubleshooting/problems/ota-publish-static-export-failures.md`.

**Sweep** — every path, script name, and symbol quoted in docs must match reality:
```bash
grep -rln "scripts/ota\|build-static\|features/ota\|content-version\|release-commands/domain" docs README.md
```

---

## 10. TESTS

`tsx` entrypoints only — no jest/vitest. `packages/ota-core/src/tests/index.test.ts` imports every file
below it, and that file must exist before you reference it in `package.json` (§1 item 8).

**Port intact** (do not weaken assertions): `ota-delivery.test.ts`, `ota-background-delivery.test.ts`,
`ota-hardening.test.ts`, `test-ota-native-compatibility.ts`, `test-ota-r2-retry.ts`.

**Unit** — counter resets on a new native line; counter advances on the same line; refusal when a version
does not outrank the live one; `androidVersionCodeFor` derivation; gate open / blocked / unprovable;
gate reopens by itself when native returns to the baseline (no revert-detection branch exists).

**Integration** — a blocked gate refuses and uploads nothing; TEST intent leaves the version untouched
and uploads nothing; PUBLISH intent advances exactly one counter step; a publish interrupted before the
manifest leaves no live manifest; `publishOtaRelease` without `confirmUpload` refuses **before** building.

**Contract** —
- `ota-core-runtime-purity.test.ts`: walk the module graph of `src/index.ts` and fail if any node builtin
  (`node:*`, `fs`, `path`, `child_process`, `crypto`) or node-only dependency (`@aws-sdk/*`,
  `google-auth-library`, `dotenv`) appears. This is the §4 seal.
- `ota-core-boundary.test.ts`: exported surface snapshot; no vendor identifiers; every export exists
  (grep each asserted name first — §1 item 7).
- `ota-core-no-duplication.test.ts`: assert the §9-step-9 symbols appear in exactly one implementation
  file repo-wide.

---

## 11. VERIFICATION — run every command, paste literal output in your report

```bash
npm install
npm run lint
npm run typecheck
npm run architecture:check
npm run test:ota-core
npm run test:native-core
npm run test:notifications
npm run version:validate
npm test
npm run build:static
npm run ota:check
npm run ota:status
```

After `build:static`, check `git status public/asol-web-manifest.json`; restore with
`git checkout --` if only the verification build touched it.

**Seal probes — every one must return zero lines:**
```bash
# old trees gone
ls -d scripts/ota scripts/build-static scripts/ota-publish src/features/ota 2>/dev/null
# old files gone
ls scripts/ota-publish.ts scripts/ota-status.ts scripts/ota-keygen.ts scripts/ota-self-test.ts \
   scripts/build-static.ts scripts/serve-static.ts scripts/assert-release-static-bundle.ts \
   scripts/test-ota-native-compatibility.ts scripts/test-ota-r2-retry.ts \
   src/modules/release-commands/domain/content-version.ts 2>/dev/null
# no deep imports
grep -rn "@asol/ota-core/src\|@asol/ota-core/publishing/" --include="*.ts" --include="*.tsx" src scripts packages
# no node-only deps outside the package (fcm exception allowed only if documented)
grep -rn "@aws-sdk/\|google-auth-library" --include="*.ts" --include="*.tsx" src scripts | grep -v "fcm-http-v1"
# no duplicated logic
grep -rn "inspectNativeCompatibility\|nextContentVersion\|compareOtaVersions\|assertReleaseStaticBundle\|resolveGooglePlayCredentials" --include="*.ts" --include="*.tsx" src scripts services | grep -v "@asol/ota-core"
# no stale references
grep -rn "features/ota\|scripts/ota\|build-static" --include="*.ts" --include="*.tsx" --include="*.md" --include="*.json" src scripts services docs README.md package.json
# no dead npm scripts
grep -n "test:ota-delivery\|test:ota-background\|test:ota-hardening\|test:ota-compatibility\|test:ota-r2-retry" package.json
```

**Deep-import must fail typecheck:**
```bash
printf 'import * as x from "@asol/ota-core/domain/versioning/content-version";\nexport const p = x;\n' > src/__probe__.ts
npx tsc --noEmit    # expect: error TS2307 on src/__probe__.ts
rm -f src/__probe__.ts
```

**Do not run `ota:publish` without `--dry-run`, any fastlane upload lane, `cutNativeRelease`, or
`deploy:all`.** Those reach production.

---

## 12. REPORTING

For every claim, paste the command and its literal output. Claims without evidence are treated as false.

1. File inventory: moved / created / deleted, old path → new path.
2. Both public surfaces in full, runtime vs publishing made explicit.
3. The §6 step 9 duplication table, with the grep output proving one implementation each.
4. Every rewritten call site, grouped by area.
5. Literal results for every command in §11, including **NOT RUN — requires <X>** where applicable.
6. Anything you deliberately did not do, and why.
7. Any place where this specification was impossible to follow exactly, what you did instead, and why —
   §1 forbids silently choosing an alternative.
