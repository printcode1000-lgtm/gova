# `@asol/ota-core` — Architecture Reference

> **Canonical path**: `packages/ota-core/`  
> **Package name**: `@asol/ota-core`

---

## 1. Two Entry Points

| Entry | Import path | Runs where | May import |
| :-- | :-- | :-- | :-- |
| **Runtime** | `@asol/ota-core` | Browser + Next.js SSR | Pure TS, `@asol/native-core`. **Zero node builtins.** |
| **Publishing** | `@asol/ota-core/publishing` | Node scripts only | Everything: `@aws-sdk/*`, `google-auth-library`, `node:fs`, `node:child_process` |

### Why two doors?

The runtime entry is bundled into the shipped web application. If `@aws-sdk/client-s3` or the
Google Play credential path were reachable from it, both would be included in the client bundle
and shipped to every user's browser. The `exports` seal in `package.json` enforces this: only
two named exports exist; a wildcard entry is explicitly prohibited so deep-path imports are a
TypeScript error rather than a silent bundle bloat.

The contract test `runtime-sealing.test.ts` walks the full module graph of `src/index.ts` and
fails the build if any node builtin or node-only dependency appears.

---

## 2. The Native-Surface Gate

`publishing/gate/native-gate.ts` exports `evaluateReleaseGate()`. It is the **single decision
point** for whether an OTA publish is safe.

```
evaluateReleaseGate() → GateDecision
  | { state: "open";      nativeVersion; baseline }
  | { state: "blocked";   nativeVersion; baseline; changedPaths; changedNativeDependencies; reason }
  | { state: "unprovable"; reason }   // no native-v* baseline resolvable
```

### Two exits from a blocked gate

When the gate is `"blocked"`, the `reason` field names both ways out:

1. **Cut and publish a new native release** (`cutNativeRelease()`) — this advances the native
   version so the changed compiled source or dependency is now inside the new shell.
2. **Revert the native changes to the baseline** — bring `android/`, `ios/`, `capacitor.config.ts`,
   `packages/native-core/`, and any changed native dependencies back to the state recorded in the
   newest `native-v*` git tag.

The `"unprovable"` state means no `native-v*` tag is resolvable in the current repository. The
gate **fails closed**: without a baseline nothing can be proven compatible, so publishing is refused.

### What `architecture:check` does NOT do

`architecture:check` prints the native surface report but **does not fail** on native drift. It is
a developer report, not a release gate. Turning it into a gate would block normal development work
(any Android layout change would block `npm run architecture:check`). The **refusal** lives only
inside `publishOtaRelease()` and `runLocalRefresh()`.

---

## 3. Two Publishing Intents

### TEST intent — `runLocalRefresh({ capSync })`

- Builds `out` at the **current** content version — no version bump.
- Uploads **nothing** to R2.
- Contacts R2 only if `readLiveOtaRelease()` is needed for status reporting.
- Reusing the current version number for a local rebuild is deliberate: this is a developer tool,
  not a claim that the local bundle equals what users have. Do not "fix" it into a byte comparison.

### PUBLISH intent — `publishOtaRelease({ confirmUpload: true, ... })`

- Requires gate `"open"`.
- Advances the content counter exactly one step on the current native line, using
  `readLiveOtaRelease()` as `previous`.
- Builds `out`. Uploads. Writes the signed manifest **last**.
- `confirmUpload: true` must be passed explicitly on every invocation. An absent or `false` value
  causes refusal before any build work begins. This is §7: human confirmation for irreversible acts.

---

## 4. Version Scheme

```
Shell 0.2.4  → content version 0.2.4.0   (first OTA on this native line)
OTA #1       → content version 0.2.4.1
OTA #2       → content version 0.2.4.2
New shell    → content version 0.2.5.0   (counter resets; native triple advances)
```

**Ordering is load-bearing.** Native triple first. Each installed bundle runs the comparison that
shipped inside it. A version that does not strictly advance is read as "no update" by that bundle,
and the release reaches no one. `assertContentVersionAdvances` enforces this and must keep
refusing that case with its current error text.

`androidVersionCodeFor(nativeVersion)` derives the numeric `versionCode` used in `build.gradle`
from the native version string. One implementation exists repo-wide; `validate-app-versions.ts`
and `cap-build.ts` both call it from `@asol/ota-core`.

---

## 5. Where Live Truth Comes From

| Truth | Source | Function |
| :-- | :-- | :-- |
| Current native + content version | Working tree (`build.gradle` is authoritative) | `readCurrentVersions()` |
| Live OTA manifest on R2 | Read-only GET of `app-updates/manifest.json` | `readLiveOtaRelease()` |
| Google Play track versions | `androidpublisher.googleapis.com` API | `readLivePlayRelease(track)` |

No fastlane calls for reading versions. No second Play client. Credential resolution lives in
`publishing/adapters/google-play.adapter.ts`; `google-play-credentials.server.ts` re-exports from
there.

---

## 6. Runtime Invariants (§8)

1. **Version ordering is load-bearing.** See §4. `assertContentVersionAdvances` must keep refusing
   non-advancing versions.
2. **A store release publishes nothing.** Shell `x.y.z` carries `x.y.z.0`; the first OTA on that
   line is `.1`. There is no "publish at `.0`" path.
3. **The signed manifest is written last.** An interrupted publish must not leave a live manifest.
   `ota:status` is a read-only GET of `app-updates/manifest.json`; together they are the only way
   to tell whether an interrupted publish landed.
4. **Revocation drift recovery.** The publish path merges tracked revocations with the live signed
   document and warns on recovery. Dropping a revocation un-revokes a release on every device.
5. **Diagnostic bundles never reach native assets.** `assertReleaseStaticBundle` refuses a manifest
   with `diagnostic: true` on every path that copies `out` into a native project.
6. **Capability gating.** The capability scan maps a public `NativeCore.*` method to each
   capability key and fails when a key has no pattern. It must keep failing the build, and must
   read `@asol/native-core` through its public entry only. Never delete a key to make the check
   pass — a failing check is evidence of a real defect.
7. **`build:static` rewrites the release manifest.** Without the release env vars it downgrades
   `releaseId`/`version`/`minimumNativeVersion` to the `package.json` version. `ota-core` owns
   both the build and this guard (`release-manifest-guard.ts`).
8. **TEST intent uploads nothing and compares nothing against R2.** See §3.

---

## 7. Human Confirmation for Irreversible Acts (§7)

Three acts require an explicit per-invocation flag. An absent or unrecognised flag causes refusal
before any work begins — never a default, never inferred.

| Act | CLI flag | SDK flag |
| :-- | :-- | :-- |
| Upload to R2 (OTA reaching real devices) | `--confirm-upload` | `confirmUpload: true` |
| Write native version numbers into the tree | `--confirm-version-write` | `confirmVersionWrite: true` |
| Create or push a `native-v*` git tag | `--confirm-tag-push` | `confirmTagPush: true` |

---

## 8. Enforcement Layers

1. **`exports` seal** in `package.json` — two doors, no wildcard.
2. **ESLint** — bans `@asol/ota-core/*` deep-path imports repo-wide; bans `@aws-sdk/*` and
   `google-auth-library` outside `packages/ota-core/src/publishing/adapters/**` (with a narrow
   exception for `fcm-http-v1.server.ts`, documented in the `@asol/notifications` README).
3. **Architecture contract** — `architecture-check.ota-core-contract.ts` runs as part of
   `npm run architecture:check`.
4. **Contract tests** — `runtime-sealing.test.ts` (module graph purity) and
   `publishing-exports.test.ts` (surface snapshot), both in `packages/ota-core/src/tests/`.

---

## 9. npm Scripts

| Script | What it does |
| :-- | :-- |
| `ota:publish` | Publish an OTA release (requires `--confirm-upload`) |
| `ota:check` | Dry-run of `ota:publish` — gate + version derivation, no upload |
| `ota:status` | Read-only status of the live R2 manifest |
| `ota:keygen` | Generate a new OTA signing keypair |
| `ota:revoke` | Revoke a published OTA release |
| `ota:self-test` | Self-test the OTA pipeline without uploading |
| `build:static` | Full static export pipeline (gate + Next build + audits) |
| `serve:out` / `preview:static` | Serve the `out/` directory locally |
| `version:validate` | Validate that all version files are consistent |
| `test:ota` | Run the full `@asol/ota-core` test suite |
