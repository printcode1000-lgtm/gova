# MISSION: Consolidate ALL native/device code into a single sealed package `packages/native-core`

You are working in the repository at `C:\Users\hesham\Desktop\gova` (app id `hgh.asol.app`, product name "ASOL").
Execute this task completely. Do not ask for confirmation. Do not stop halfway.

---

## 1. GOAL

Every line of code that touches the device — Android Java, iOS Swift, custom Capacitor plugins, and the
TypeScript that wraps them — must end up inside **one sealed package: `packages/native-core`**.

The rest of the repository must become *incapable* of touching native details:
it may only call a narrow public API and must never know that Capacitor exists.

**The strategic purpose is dependency-upgrade isolation:** upgrading `@capacitor/core`, any
`@capacitor/*` plugin, `@capacitor-mlkit/*`, `@capawesome/*`, `@capgo/*`, the Android Gradle Plugin, or
the iOS SPM deps must require changes **only inside `packages/native-core`** and **zero** changes
anywhere else in the repo. Design every boundary with that single test in mind.

---

## 2. NON-NEGOTIABLE EXECUTION CONSTRAINTS

These override any instinct toward caution:

- **NO phased migration.** One radical cutover in a single working tree state.
- **NO compatibility layers, NO shims, NO barrel re-export stubs** left at old paths.
  `src/native-platform/` must **cease to exist** as a directory. Do not leave `index.ts` files that
  re-export from the new package "for compatibility". Delete them.
- **NO deprecation period, NO `@deprecated` markers, NO parallel old/new implementations.**
- **NO `any`, no `@ts-ignore`, no `eslint-disable`** to make the cutover compile. Fix it properly.
- Every single call site in the repo gets rewritten to the new API. All 47+ of them.
- If a rule in this document conflicts with an existing code comment, **this document wins** — except
  for the runtime invariants in §10, which are absolute.

---

## 3. REPOSITORY FACTS (verified — do not re-derive, but do re-verify before relying on)

- Next.js 16.3.1 + React 19, TypeScript strict, Capacitor 8.4.1.
- **Not currently a monorepo.** `package.json` has no `workspaces`. You must add it.
- Package manager: `npm@11.19.0`, Node `>=22 <25`.
- Path alias today: `@/*` → `./src/*` (in `tsconfig.json`).
- **Test framework: there is none.** Tests are standalone `tsx` scripts executed by npm scripts,
  e.g. `"test:native-platform": "npx tsx src/native-platform/tests/native-platform-contract.test.ts"`.
  New tests **must follow this exact convention** — plain `tsx` entrypoints that `process.exit(1)` on
  failure. Do NOT introduce jest/vitest/mocha.
- **Existing enforcement engine:** `scripts/architecture-check.ts` (92 lines) + `scripts/architecture-check/`
  (`architecture-check.architecture-types.ts`, `.file-analysis.ts`, `.native-contract.ts`,
  `.notification-contract.ts`). It already contains `checkNativePlatformContract` and
  `reportNativeSurface`. **Extend this engine — do not build a second one.**
- Lint config: `eslint.config.js` (CommonJS flat config). It already ignores `android/**` and `ios/**`
  and already uses `no-restricted-imports` to fence off `src/modules/data-access`. **Follow that exact
  pattern** for the new fence.
- **There is no `.github/` directory.** You must create it from scratch.
- `capacitor.config.ts` at repo root: `appId: "hgh.asol.app"`, `webDir: "out"`, plugin config for
  `StatusBar` and `PushNotifications`.
- A second source tree exists at `services/notifications/` fed by
  `scripts/sync-notifications-service-sources.ts`. It runs in `build` and `build:static`. Do not break it.

---

## 4. EXHAUSTIVE SCOPE — everything below moves into `packages/native-core`

### 4.1 TypeScript wrapper layer (moves wholesale, then is restructured)
The entire `src/native-platform/` tree (≈118 files, 25 sub-domains):
`action-sheet, app, background-download, barcode, browser, camera, capabilities, clipboard, core,
device, dialog, files, haptics, keyboard, location, network, notifications, permissions, preferences,
screen-orientation, share, speech, splash-screen, status-bar, storage-capacity, text-zoom, toast`
plus `src/native-platform/index.ts` and `src/native-platform/tests/`.

### 4.2 Capacitor-coupled adapters currently living OUTSIDE native-platform (must be absorbed)
These import `@capacitor/*` directly and therefore violate the goal:
- `src/platform/media/capacitor-image-source-adapter.ts`
- `src/platform/navigation/capacitor-back-button-adapter.ts`
- `src/platform/ota/capacitor-ota-adapter.ts`
- `src/platform/speech/speech-recognition-adapter.ts`
- `src/features/ota/services/ota-api-service.ts` — *only* the Capacitor-touching part
- `src/features/page-snapshot/hooks/use-page-snapshot.tsx` — *only* the Capacitor-touching part
- `src/features/notifications/infrastructure/capacitor/` — **all 7 services**:
  `capacitor-app-state.service.ts`, `capacitor-badge.service.ts`, `capacitor-local-notification.service.ts`,
  `capacitor-native-inbox.service.ts`, `capacitor-permission.service.ts`, `capacitor-platform.service.ts`,
  `capacitor-push.service.ts`
- `platform/capacitor.defaults.ts` (repo root `platform/` dir)

Run this to confirm you found every one, and re-run it at the end (must return **only**
`packages/native-core/**` paths):
```bash
grep -rn "@capacitor\|@capawesome\|@capgo\|@capacitor-mlkit" --include="*.ts" --include="*.tsx" src platform scripts services
```

### 4.3 Android native (custom code only — Capacitor-generated scaffolding stays)
From `android/app/src/main/java/hgh/asol/app/`:
`AppSettingsPlugin.java`, `AsolAppLifecycle.java`, `AsolNotificationChannels.java`,
`AsolNotificationInboxPlugin.java`, `AsolNotificationInboxStore.java`, `AsolNotificationRecord.java`,
`AsolNotificationTapProtocol.java`, `AsolPushMessagingService.java`, `BackgroundDownloadPlugin.java`,
`ShareReceivePlugin.java`, `StorageCapacityPlugin.java`, and `MainActivity.java` (see §10.1 — it stays
in the app module but must be reduced to a thin delegate).

Owned Android resources that belong to the module:
`res/raw/custom_notification.mp3`, `res/drawable/ic_stat_asol_notification.xml`,
`res/values/notification_colors.xml`, and the notification-related keys in `res/values/strings.xml`.

Owned instrumented tests (move with the code):
`androidTest/java/hgh/asol/app/NotificationChannelStartupInstrumentedTest.java`,
`NotificationDeliveryInstrumentedTest.java`, `NotificationInboxInstrumentedTest.java`,
`NotificationSoundInstrumentedTest.java`.
(`WebBundleInstrumentedTest.java` and the `com.getcapacitor.myapp` samples stay put.)

Also in scope: `android/app/proguard-rules-testable-app.pro` and any R8 rule that names the classes above.

### 4.4 iOS native (custom code only)
From `ios/App/App/`: `AppDelegate.swift` (see §10.1), `BackgroundDownloadPlugin.swift`,
`ShareReceivePlugin.swift`, `StorageCapacityPlugin.swift`.
Also `ios/ShareExtension/ShareViewController.swift` and `ios/App/CapApp-SPM/` wiring.

### 4.5 Native-facing scripts (move under the package and re-point npm scripts)
`scripts/sync-android-push-assets.ts`, `scripts/validate-android-backup-policy.ts`,
`scripts/validate-android-r8-policy.ts`, `scripts/validate-ios-push-policy.ts`,
`scripts/normalize-capacitor-spm-paths.ts`, `scripts/audit-capacitor-defaults.ts`,
`scripts/android-device-install.ts`, `scripts/android/device-install.ts`,
`scripts/android-device-tests.ts`, `scripts/verify-android-r8-release.ts`.

---

## 5. TARGET STRUCTURE

```
packages/native-core/
  package.json          # name "@asol/native-core", private, "exports" seals internals (see §7)
  tsconfig.json
  README.md             # ownership, upgrade playbook, how to add a capability
  src/
    index.ts            # THE ONLY public entrypoint
    api/                # public surface — see §6
    capabilities/       # capability registry / feature detection
    domain/             # pure logic, ZERO Capacitor imports (channel ids, sound resolution, validation)
    validation/         # input schemas + guards (see §8)
    adapters/           # THE ONLY place `@capacitor/*` may be imported
      <domain>/…
    errors/
    tests/
      unit/
      integration/
      contract/
  android/              # Gradle library module, applied to the app via settings.gradle
    build.gradle
    src/main/java/hgh/asol/app/native/…
    src/main/res/…      # raw/custom_notification.mp3, drawable, values
    src/androidTest/java/…
    proguard-rules.pro  # consumer rules, consumed by the app module
  ios/                  # Swift package, consumed by ios/App via SPM
    Package.swift
    Sources/AsolNativeCore/…
    Tests/…
  scripts/              # the native-facing scripts from §4.5
```

**Wire-up requirements:**
- Add `"workspaces": ["packages/*"]` to root `package.json`. Move every `@capacitor/*`,
  `@capacitor-mlkit/*`, `@capawesome/*`, `@capgo/*` dependency **out of the root `package.json` and
  into `packages/native-core/package.json`**. The root must not depend on any Capacitor package.
  (`@capacitor/cli` may stay at root only if `npx cap` genuinely requires it — verify; prefer moving it.)
- Root `tsconfig.json`: add `"@asol/native-core"` to `paths`. Keep `@/*` → `./src/*`.
- Android: register the Gradle module in `android/settings.gradle`, add it as a dependency in
  `android/app/build.gradle`, and keep `android/app/capacitor.build.gradle` (Capacitor-generated) untouched.
- iOS: expose the Swift package and reference it from `ios/App/CapApp-SPM/Package.swift` /
  the Xcode project. `npm run ios:spm:normalize` must still pass afterward.
- Custom plugins must be registered the Capacitor-8 way from the new module (annotation-based
  `@CapacitorPlugin` discovery + `capacitor.plugins.json`), **not** by hand-editing generated files.

---

## 6. PUBLIC API — the single door

`packages/native-core/src/index.ts` is the **only** importable path. Design it as a **small set of
explicitly named, domain-grouped async functions** (preferred over one stringly-typed `execute()`,
because it keeps TypeScript type-safety at the call site — but the door is equally sealed either way).

Requirements:
- Every exported symbol returns a **Result-style discriminated union**
  (`{ ok: true; value: T } | { ok: false; error: NativeCoreError }`) or throws a single
  `NativeCoreError` type — pick one and apply it **uniformly to every export**. No mixed conventions.
- **No Capacitor type may appear in any exported signature.** Not in parameters, not in returns, not in
  generics, not transitively. Define the package's own DTOs. Verify with a contract test (§9).
- Exported names must be domain language, not vendor language: `registerForPushNotifications()`,
  not `initPushNotificationsPlugin()`.
- Everything else — adapters, plugin loading, `core/lazy-plugin.ts`, platform detection — is internal
  and unreachable from outside.
- Keep the existing lazy/dynamic plugin-loading behaviour (`src/native-platform/core/lazy-plugin.ts`)
  so web builds do not eagerly pull native code. Preserve, do not regress, SSR/`typeof window` safety.

---

## 7. SEALING THE MODULE (must be mechanically enforced, not documented)

Implement **all four** layers:

1. **`exports` field** in `packages/native-core/package.json` mapping only `"."` → `./src/index.ts`.
   No `"./*"` wildcard. Deep imports must fail at resolution time.
2. **ESLint `no-restricted-imports`** in `eslint.config.js`, following the existing data-access pattern:
   ban the pattern `@asol/native-core/*` (anything past the root) and ban `@capacitor/*`,
   `@capacitor-mlkit/*`, `@capawesome/*`, `@capgo/*` **everywhere except `packages/native-core/src/adapters/**`**.
   Also ban any lingering `@/native-platform` and `@/platform/*capacitor*` specifier.
   Give each rule a clear `message` explaining the correct import.
3. **`scripts/architecture-check.ts`** — extend the existing engine with a `native-core-contract`
   checker (a new file `scripts/architecture-check/architecture-check.native-core-contract.ts`,
   consistent with the existing four). It must fail the build on: deep imports into the package,
   Capacitor imports outside `adapters/`, Capacitor types leaking into `src/index.ts`, and any
   surviving reference to `src/native-platform`.
4. **A boundary test** (`packages/native-core/src/tests/contract/native-core-boundary.test.ts`)
   modelled on the existing `src/features/notifications/tests/notification-module-boundary.test.ts`,
   which walks the repo source and asserts zero violations.

---

## 8. INTERNAL VALIDATION

The package must not trust its callers.

- Every public function validates its arguments at the boundary **before** any native call.
- Use `zod` (already a root dependency at `^4.4.3`; add it to the package's own deps) or hand-written
  guards — but be consistent across the whole package.
- Invalid input produces a typed, non-throwing failure (or a single typed throw, per §6), never a
  raw Capacitor exception and never an unhandled rejection.
- Validation must also cover **inbound** data from the native side (push payloads, plugin results,
  deep-link/tap protocol data) — treat anything crossing the JS↔native bridge as untrusted.
- Each public function must be safe to call on: web (no native shell), Android, and iOS. It must
  degrade predictably, never crash, when a capability is absent — reuse/port the existing
  `capabilities/capability-registry.ts` concept.

---

## 9. TESTS — mandatory, and they must gate the build

Write these as `tsx` entrypoints under `packages/native-core/src/tests/`, matching the repo convention.

**Unit** (no Capacitor, pure logic):
- Notification channel-id resolution, sound resolution, channel-id constants.
- All validation schemas: valid input, invalid input, boundary/edge cases, hostile input.
- Error mapping and the Result union.
- Capability registry decisions per platform.

**Integration** (fake/in-memory adapters standing in for Capacitor — no real device):
- Push registration → token delivery → inbound notification → tap routing, end to end.
- Behaviour when a plugin is missing, when permission is denied, and when running on web.
- Background-download, share-receive, and storage-capacity flows.

**Contract** (the anti-regression armour — these are the ones that make upgrades safe):
- `native-core-boundary.test.ts` — no deep imports, no Capacitor outside `adapters/`, no
  `src/native-platform` references anywhere.
- `native-core-public-api.test.ts` — snapshot the exported symbol names **and their type shapes**;
  fail if the surface changes without an intentional snapshot update. Assert no Capacitor type leaks.
- **Port and preserve** the existing Java↔TypeScript parity check currently in
  `src/features/notifications/tests/notification-sound-contract.test.ts` and
  `android-notification-inbox-contract.test.ts`. These compare `AsolNotificationChannels.java`
  against the TS sound/channel logic. They must keep working against the new file locations —
  update the paths they read, never weaken the assertions.
- An SRP check: assert no file under the package exceeds a sane size and that each file exports one
  cohesive concern (a lightweight heuristic check is acceptable; document the rule in the README).

**Wiring:**
- Add `"test:native-core": "..."` to root `package.json`, chaining every test file.
- **Replace** `test:native-platform` with it in the root `"test"` script (do not leave a dead script).
- Add `test:native-core` and `architecture:check` to the `build` and `build:static` pipelines so a
  breaking edit fails the build, exactly as `test:notifications` already does.

---

## 10. RUNTIME INVARIANTS THAT MUST NOT REGRESS

These are correctness-critical. Violating any of them ships a broken app to users.

### 10.1 Android notification channels are created before JavaScript exists
`MainActivity.java:41` calls `AsolNotificationChannels.ensureCreated(this)` during `onCreate`,
**before** the WebView loads. This is mandatory: on Android 8+ a channel's sound, importance, and
vibration are **immutable after first creation**, and FCM cannot display a notification whose channel
does not yet exist — a push can arrive with the app fully killed and no JS ever running.
**This call must remain in native `onCreate`, before any web/JS work.** You may delegate it into the
new module (`AsolNativeCore.onCreate(this)`), but you must not move it to TypeScript, and you must
not make it lazy, async, or conditional on the WebView.
The same principle applies to `AppDelegate.swift`'s APNs registration forwarding
(`didRegisterForRemoteNotificationsWithDeviceToken` / `didFailToRegisterForRemoteNotifications`):
keep it in the native delegate; without it JS never receives the iOS token.

### 10.2 Channel identity is frozen
Channel ids **must remain exactly** `asol_general_v4`, `asol_orders_v4`, `asol_chat_v4`,
`asol_urgent_v4`, `asol_updates_v4`, `asol_silent_v4`. Changing an id destroys every per-channel
preference the user has set. The sound resource must remain named `custom_notification` and remain
addressed **by resource name** (`android.resource://<pkg>/raw/custom_notification`), never by numeric
id — the existing code documents why (numeric ids are regenerated per build; a persisted channel
outlives the install). Keep the two existing guard clauses that throw when the resource is missing or
renamed. Keep the resource reachable by R8's shrinker.

### 10.3 Identity and packaging
`appId` stays `hgh.asol.app`. The Java package for **Capacitor-registered plugin classes** must stay
resolvable exactly as `capacitor.plugins.json` / annotation discovery expects — if you relocate a
plugin class to a new Java package, you must update every reference: `AndroidManifest.xml`, the
`capacitor.plugins.json` assets, all ProGuard/R8 rules (`proguard-rules.pro`,
`proguard-rules-testable-app.pro`, `proguard-rules-test-apk.pro`), and the instrumented tests.
`AsolPushMessagingService` is declared in `AndroidManifest.xml` — its class name there must match.

### 10.4 OTA / release pipeline
`scripts/ota/ota-native-compatibility.ts` computes a native baseline that gates OTA updates. Moving
native files may change what it hashes/scans. Inspect it and update it deliberately so
`npm run test:ota-compatibility` still passes and the baseline still describes the real native surface.
`npm run cap:sync` and `cap:copy` run `assert-release-static-bundle`, `android:push:sync-assets`,
`android:backup:validate`, `android:r8:validate`, and `ios:push:validate` — all must still pass.

---

## 11. SRP — one reason to change per file

Inside the package, every file has exactly one responsibility. Concretely:
- Split any file that mixes concerns. Example: channel definitions, sound-URI construction, and
  channel-id resolution are three files, not one.
- One adapter file per plugin. An adapter translates that plugin's API to the package's internal
  interface and does nothing else — no business logic, no validation, no routing.
- Domain logic files must be pure and import nothing from `adapters/`.
- Dependency direction is strictly one-way: `api/ → validation/ → domain/ → (interfaces) ← adapters/`.
  `domain/` must never import from `adapters/` or `api/`.
- Name files for their responsibility. No `utils.ts`, no `helpers.ts`, no `misc.ts`, no `index.ts`
  outside the package root entrypoint and legitimate sub-barrels.

---

## 12. GOVERNANCE (create `.github/` from scratch — it does not exist)

- **`.github/CODEOWNERS`** — assign ownership of `packages/native-core/**`, `android/**`, `ios/**`,
  `capacitor.config.ts`, and `.github/**`. Use the repo owner's GitHub handle; if you cannot determine
  it, use the placeholder `@OWNER` and say so clearly in your final report.
- **`.github/workflows/native-core.yml`** — on pull_request and push to `main`, run:
  `npm ci`, `npm run lint`, `npm run typecheck`, `npm run architecture:check`, `npm run test:native-core`,
  `npm run test:notifications`, `npm run version:validate`. Node 22, npm 11.
- **`.github/pull_request_template.md`** — a checklist for native-touching PRs covering the §10 invariants.
- **Branch protection cannot be set from code.** Write the exact required settings (required status
  checks by job name, require review from CODEOWNERS, no force-push to `main`) into the docs and
  list them in your final report as manual steps for the repo owner.

### 12.1 DOCUMENTATION IS PART OF THE DELIVERABLE, NOT AN AFTERTHOUGHT

Docs in this repo are treated as specification, not commentary. A doc that still describes
`src/native-platform` after the cutover is a **defect of equal severity to broken code**.

**Write new:** `docs/01-architecture/native-core-module.md` covering:
the module boundary and why it exists; the complete public API; the four sealing mechanisms (§7);
the dependency direction rule (§11); the §10 runtime invariants **with their reasoning preserved**;
and — most importantly — the **dependency-upgrade playbook**: a step-by-step "to upgrade Capacitor or
any plugin, change only these files, then run these commands" procedure. This playbook is the primary
artifact justifying the whole migration.

**Rewrite (these describe the moved code directly — highest priority):**
- `docs/07-mobile-and-release/capacitor/native-platform.md` — describes the old tree; must be
  rewritten around the new package or replaced by a pointer to the new doc.
- `docs/07-mobile-and-release/capacitor/native-surface-protection.md`
- `docs/07-mobile-and-release/capacitor/android-push-notifications.md`
- `docs/07-mobile-and-release/capacitor/ios-push-notifications.md`
- `docs/07-mobile-and-release/capacitor/capacitor.md`
- `docs/07-mobile-and-release/capacitor/mobile-back-button-system.md`
- `docs/07-mobile-and-release/capacitor/ota-update-system.md`
- `docs/07-mobile-and-release/capacitor/installation-state-and-clean-testing.md`
- `docs/05-platform-features/notification-system.md`
- `docs/05-platform-features/sharing-system.md`
- `docs/05-platform-features/voice-input-system.md`
- `docs/05-platform-features/network-status-system.md`
- `docs/04-ui-components/page-snapshot-system.md`
- `docs/02-data-and-storage/storage-image-source-picker-system.md`
- `docs/00-overview/technologies.md`
- `docs/01-architecture/data-layers/22-scripts-and-workflows.md` (npm script names changed)
- `docs/01-architecture/data-layers/16-deployment-targets.md`

**Sweep (44 files total mention native/Capacitor — audit every one):**
```bash
grep -rln "native-platform\|Capacitor\|capacitor\|AsolNotificationChannels\|AppDelegate\|MainActivity" docs README.md
```
For each hit, either update it or confirm it is still accurate. Also update `README.md` and any
`docs/**/README.md` index that lists the project structure.

**Rules for the doc pass:**
- Every file path, import example, npm script name, and class name quoted in the docs must match the
  post-migration reality. Stale paths are failures.
- Preserve the *reasoning* already captured in the current code comments (why channels are created
  pre-JS, why the sound is addressed by name not numeric id, why ids are frozen at `_v4`). This
  knowledge must survive the move — relocate it into the new doc and the new code, never drop it.
- Match the existing docs' language and formatting conventions (inspect neighbouring files first).
- Add the docs sweep to your §14 report: list every doc file touched and every one you audited and
  deliberately left unchanged.

---

## 13. VERIFICATION — every one of these must pass before you report done

```bash
npm install
npm run lint
npm run typecheck
npm run architecture:check
npm run test:native-core
npm run test:notifications
npm run test:native-platform   # must now FAIL AS "script not found" — confirm it is removed, not stubbed
npm run android:backup:validate
npm run android:r8:validate
npm run ios:push:validate
npm run cap:verify-defaults
npm run test:ota-compatibility
npm run version:validate
npm run build:static
```

Then prove the seal holds — each of these must return **zero** results:
```bash
grep -rn "native-platform" --include="*.ts" --include="*.tsx" --include="*.json" src scripts services docs
grep -rn "@capacitor\|@capawesome\|@capgo\|@capacitor-mlkit" --include="*.ts" --include="*.tsx" src platform scripts services
grep -rn "@asol/native-core/" --include="*.ts" --include="*.tsx" src scripts
grep -rn "native-platform" docs README.md          # docs must be updated too — see §12.1
grep -rn "test:native-platform" package.json docs  # the old script name must be gone everywhere
```
And confirm `src/native-platform/` and the root `platform/` directory no longer exist.

Android/iOS builds: run `npm run android:build:debug` if the local toolchain allows it. If a native
build cannot run in this environment, say so explicitly in your report — do **not** silently skip it
and do **not** claim it passed.

---

## 14. FINAL REPORT (required)

When finished, produce a report containing:
1. Complete file inventory: moved, created, deleted — with old path → new path.
2. The full public API surface of `packages/native-core` (every exported symbol and its signature).
3. Every call site rewritten, grouped by feature.
4. Verification results: the literal pass/fail of each command in §13. **Report failures honestly** —
   do not describe a skipped or failing step as passing.
5. Manual follow-ups the owner must do (branch protection settings, CODEOWNERS handle if you used the
   placeholder, any signing/store step).
6. The upgrade playbook: the exact files a future `@capacitor/*` version bump would touch — this is
   the deliverable that proves the mission succeeded.

---

## 15. IF YOU HIT A HARD BLOCKER

If something is genuinely impossible (a native build tool is absent, a generated file cannot be
regenerated, a Capacitor constraint forbids a layout), do **not** invent a compatibility layer and do
**not** silently narrow the scope. Complete everything else, then state the blocker precisely in the
report: what you tried, why it failed, and the two best options for resolving it.
