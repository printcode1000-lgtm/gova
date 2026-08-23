> **Note:** Operational detail relocated here during the 2026-08 architecture reconstruction. Architectural relationships: [docs/01-architecture/](../../01-architecture/README.md).

# Architecture: `@asol/native-core` Sealed Native Platform Module

## 1. Goal & Architecture Boundary

The `@asol/native-core` package (`packages/native-core/`) is the single sealed boundary separating web application code from device and native capabilities (Android Java, iOS Swift, and Capacitor plugins).

### Why the Boundary Exists
1. **Dependency Upgrade Isolation**: Upgrades to `@capacitor/core`, `@capacitor/*`, `@capawesome/*`, `@capgo/*`, Android Gradle Plugin, or iOS Swift Package Manager dependencies require edits **strictly inside `packages/native-core/`** and **zero** changes anywhere else across `src/` or `scripts/`.
2. **Type Safety & Platform Degradation**: All public APIs export strict Result discriminated unions (`{ ok: true; value: T } | { ok: false; error: NativeCoreError }`) and degrade safely without crashing when invoked on standard browsers (Web fallback).
3. **Prevention of Vendor Lock-in**: No Capacitor types leak outside `packages/native-core/`.

---

## 2. Four Sealing Mechanisms

1. **Package Exports**: `packages/native-core/package.json` maps only `"." -> "./src/index.ts"`. Deep imports (e.g. `@asol/native-core/adapters/...`) are forbidden.
2. **ESLint `no-restricted-imports`**: Enforces that `@capacitor/*`, `@capawesome/*`, and `@capgo/*` can only be imported within `packages/native-core/src/adapters/**`.
3. **Architecture Contract Engine**: `packages/architecture-core/src/checks/native-core-contract.ts` walks the whole repository during `architecture:check`, which runs inside `build` and `build:static`. This is the mechanism that scans every file.
4. **Contract Tests**: `packages/native-core/src/tests/contract/` locks the *shape* of the boundary — `native-core-boundary.test.ts` pins the exported surface, and `native-core-ast-boundary.test.ts` checks the public entrypoint for leaked vendor types. These assert on the package itself; repo-wide scanning is mechanism 3's job.

The `paths` entry in the root `tsconfig.json` deliberately maps only the bare specifier `@asol/native-core`. A `@asol/native-core/*` wildcard must never be reintroduced: it silently re-opens every internal file and defeats mechanism 1.

---

## 3. Dependency Direction & Single Responsibility Principle (SRP)

- **One-Way Flow**: `api/` -> `validation/` -> `domain/` -> `(interfaces)` <- `adapters/`
- `domain/` is 100% pure TypeScript logic with zero Capacitor dependencies.
- `adapters/` contains isolated bridges that communicate with plugins and translate native errors into `NativeCoreError`.
- `validation/` parses and validates inbound/outbound payloads using strict schemas.

---

## 4. Runtime Invariants (§10)

1. **Android Pre-WebView Notification Channels**:
   - `AsolNotificationChannels.ensureCreated(this)` runs in `MainActivity.onCreate` before WebView initialization.
   - Android channels are immutable after creation; creating them early ensures background FCM pushes display with the correct importance and sound even when the app process was dead.
2. **Frozen Channel IDs**:
   - `asol_general_v4`, `asol_orders_v4`, `asol_chat_v4`, `asol_urgent_v4`, `asol_updates_v4`, `asol_silent_v4`.
   - Notification sound mapped strictly to `custom_notification` resource name.
3. **iOS APNs Forwarding**:
   - `AppDelegate.swift` forwards device tokens to ensure Firebase/APNs token registration completes.

4. **Never crash a host that has no native shell**:
   - Several Capacitor web implementations register DOM listeners in their constructor, and Capacitor instantiates them inside an internal load that callers never await. On a host with neither a native bridge nor a DOM — Node, and any server-side render — that constructor throws where nothing can catch it, taking the process down instead of failing one call.
   - `adapters/lazy-plugin.ts` therefore refuses to touch a plugin unless `isNativePlatform() || hasDom()`. The check is re-evaluated on every call, never cached, because the DOM appears partway through a server-rendered page's life.
   - The guarantee this preserves: **every public method settles, and settles as a `Result`**, on every host. `tests/integration/native-core-host-behaviour.test.ts` enforces it, including a settle-time budget so a method can never hang a screen behind a spinner with no error to show.

5. **A plugin proxy must never be mistaken for a promise**:
   - A Capacitor plugin with no web implementation returns a callable for *any* property read, `then` included. Resolving a promise with such an object makes the runtime read `.then`, find a function, and call it — surfacing in the browser as `"<Plugin>.then() is not implemented on web"` from code that never mentioned `then`.
   - `sanitizePlugin()` in `adapters/lazy-plugin.ts` returns `undefined` for that one key, making the object a plain value again.
   - **Ordering is the whole point.** An `async` loader that returns the raw plugin has already resolved a promise with it, so the throw happens inside the loader — sanitizing after the `await` is too late. Every loader must therefore return `sanitizePlugin(x)` or a boxed `{ plugin: x }`, never a bare plugin identifier. `tests/unit/lazy-plugin.test.ts` scans every adapter and fails if one regresses, because this failure appears only in a real browser and no test here can reach it otherwise.

---

## 4b. Capabilities and OTA gating

`domain/capabilities/capability-keys.ts` names every native capability; `shell-capabilities.ts` records the shell version each was shipped in. `packages/ota-core/src/publishing/release/capability-scan.ts` maps a public `NativeCore.*` method to each key and scans application source for call sites, so `ota:publish` can refuse to ship a web bundle to a shell that predates a capability it uses.

Two rules follow, and both are enforced by `npm run test:ota-core`:

1. **Every capability key needs a matching `apiPatterns` token.** `assertDetectionCoverage()` fails the build when a key has no pattern.
2. **A key declared shipped must keep a real public method behind it.** If a refactor drops the method, the correct repair is to restore the method — never to delete the key. Installed shells were promised that capability, and removing the key lets an OTA bundle assume a contract those shells cannot honour. `files.open` / `NativeCore.openFileExternally` is the worked example: the method was lost in a refactor and the scanner caught it.

---

## 5. Dependency Upgrade Playbook

To upgrade Capacitor or any plugin:
1. Update dependency versions inside `packages/native-core/package.json`.
2. Run `npm install` at the repository root.
3. If plugin method signatures changed, update only the corresponding adapter in `packages/native-core/src/adapters/`.
4. Run verification commands:
   ```bash
   npm run lint
   npm run typecheck
   npm run architecture:check
   npm run test:native-core
   npm run test:notifications
   npm run verify:all
   ```
5. If Android/iOS native wrappers need updates, modify `packages/native-core/android/` or `packages/native-core/ios/`, then test with `npm run android:r8:validate` and `npm run ios:push:validate`.

Gradle package builds (`android:build:debug`, `release:android`, `android:r8:verify-release`, connected-device tests) invoke `packages/native-core/scripts/android-build-preflight.ts` through `scripts/android/gradle.ts` before `gradlew`. The preflight resolves invalid `JAVA_HOME` and Android SDK root paths and stops with a bilingual error when resolution fails after search.

### Where the native code is wired in

- **Android** — `packages/native-core/android` is a Gradle library module, registered as `include ':native-core'` in `android/settings.gradle` and consumed by `implementation project(':native-core')` in `android/app/build.gradle`. `MainActivity` is a thin delegate over `AsolNativeCore`.
- **iOS** — `packages/native-core/ios` is a Swift package (`AsolNativeCore`), reached through the Capacitor SPM aggregator: `ios/App/CapApp-SPM/Package.swift` declares it as a local `.package(path:)` dependency and links its product into the target. The Xcode project references only the aggregator. There must be exactly one copy of each Swift plugin — duplicates in `ios/App/App/` mean the package is not the compiled source.

---

## 6. Test inventory

`npm run test:native-core` runs `packages/native-core/src/tests/index.test.ts`, which chains:

| Layer | File | What it protects |
| :-- | :-- | :-- |
| Contract | `contract/native-core-boundary.test.ts` | The exported surface, the frozen `_v4` channel ids, and the custom sound name |
| Contract | `contract/native-core-ast-boundary.test.ts` | No vendor types leak through the public entrypoint |
| Contract | `contract/capability-registry.test.ts` | Capability decisions per platform |
| Contract | `contract/plugin-matrix.test.ts` | The plugin/capability matrix stays coherent |
| Unit | `unit/schemas.test.ts` | Every validation schema, including hostile input |
| Unit | `unit/share-validator.test.ts` | MIME allow-list, size caps, URL safety |
| Unit | `unit/share-queue.test.ts` | Bounded depth, oldest-first eviction, deliver-once |
| Unit | `unit/lazy-plugin.test.ts` | Every plugin loader sanitizes before returning (see below) |
| Integration | `integration/share-receive-flow.test.ts` | Validator and queue together, including a share arriving **before** any listener attaches |
| Integration | `integration/native-core-host-behaviour.test.ts` | Every public method settles as a `Result` on a host with no native shell |
| Unit | `unit/native-crash-payload.test.ts` | `asol:native-crash` CustomEvent payload shape |

### Native crash bridge (`NativeCrashPlugin`)

Uncaught native exceptions on Android and iOS are captured before the process
terminates, buffered if the WebView is not ready, and dispatched to JavaScript as:

```javascript
window.dispatchEvent(new CustomEvent('asol:native-crash', { detail: { name, message, operation, stack } }));
```

`@asol/system-logs-core` listens through the native crash port registered in
`system-logs-core-bootstrap.ts` and forwards the record to persistent ingest.

Android: `NativeCrashPlugin.java`, `NativeCrashReporter.java`, registered in
`AsolNativeCore.onPreCreate`.

iOS: `NativeCrashPlugin.swift`, handler installed in `AsolNativeCore.application`.

This suite runs inside `build`, `build:static`, `npm test`, and the `native-core` GitHub workflow, so a breaking edit fails the release path rather than surfacing on a device.
