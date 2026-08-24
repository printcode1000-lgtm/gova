# Project Runtime Contract

## Binding Rule

Gova is one project delivered through **five application surfaces that must always be considered together**:

1. **Development** — local/cloud `next dev` behavior and optional Capacitor live reload.
2. **Web** — server-capable Next.js output (`.next`) and production web/Vercel behavior.
3. **Static `out/`** — Next.js static export used as a standalone bundle and as the native web payload.
4. **Android** — Capacitor Android shell consuming `out/` plus Android-native code, resources, permissions, plugins, signing, push and store policy.
5. **iOS** — Capacitor iOS shell consuming `out/` plus iOS-native code, entitlements, plugins, signing, archive and store policy.

**Every agent must evaluate all five before completing a change.** A change may be directly implemented in only one surface, but the other four must be considered for compatibility and regressions. Do not assume TypeScript/React code is “web-only”. Shared application/browser code normally reaches `out/`, and `out/` is the production payload for both native shells.

## Canonical Topology

```text
Development
npm run dev
   |
   +--> browser development on :3001
   +--> optional Capacitor live reload through CAPACITOR_SERVER_URL

Web
npm run build
   |
   v
.next
   |
   v
Next server / Vercel production

Static + Native
npm run build:static
   |
   v
out/
   |-------------------|-------------------|
   v                   v                   v
static preview     Android WebView      iOS WebView
                    + native layer       + native layer
```

`capacitor.config.ts` is authoritative that production `webDir` is `out`. `next.config.ts` is authoritative that `ASOL_MODE=static` enables `output: 'export'` and that static builds use a remote API base when required.

## Runtime Matrix

| Surface | Primary source/config | Build/runtime artifact | Critical difference |
|---|---|---|---|
| Development | `package.json`, `next.config.ts`, `.cursor/environment.json` | live Next dev server | Development-only guards, hot reload, local storage/database behavior and optional native live reload can differ from release behavior. |
| Web | `src/app/`, `next.config.ts`, service/deployment configuration | `.next` | Server Components, route handlers, server APIs, Vercel function tracing, Turso/network behavior and deployment topology exist here. |
| Static `out/` | `next.config.ts`, `scripts/build-static.ts`, `@asol/ota-core` | `out/` | No App Router API handlers are shipped. Images are unoptimized and API calls must use the configured remote origin. |
| Android | `android/`, `capacitor.config.ts`, `@asol/native-core`, Fastlane/release tooling | `out/` + Android project → APK/AAB | WebView + Android permissions/plugins/resources/push/R8/signing/store behavior. |
| iOS | `ios/`, `capacitor.config.ts`, `@asol/native-core`, Fastlane/release tooling | `out/` + iOS project → archive/store artifact | WebView + iOS entitlements/plugins/push/SPM/signing/TestFlight/App Store behavior. |

Independent `services/*` and repository tooling are additional execution contexts. They do not replace the five application surfaces above.

## Classification Rules

- `src/app/**/route.*` and `src/app/api/**` are server/web surfaces. They are **not** bundled into static `out/`.
- Shared UI/client/application code under `src/`, and browser-safe package code, must be treated as potentially affecting **Web + Static `out/` + Android + iOS + Development** unless repository evidence proves otherwise.
- Explicit server-only files can affect Development/Web and independently deployed services but still require checking that static/native callers do not depend on them directly.
- Changes under `android/` must be checked against the Android surface and against the static payload contract it hosts.
- Changes under `ios/` must be checked against the iOS surface and against the static payload contract it hosts.
- Changes to `next.config.ts`, `capacitor.config.ts`, environment keys, versioning, build scripts, storage/network behavior, authentication, notifications, or shared packages are cross-runtime by default.

## Static/Native API Invariant

A static export cannot serve its own App Router API routes. In static/Android/iOS production, client API requests must resolve to the configured remote API base. Never add a feature that works only because browser development falls back to a local same-origin API when that API is absent from `out/`.

## Native Payload Invariant

Android and iOS production shells consume the same release `out/` payload unless an explicit native-only flow says otherwise. A static web regression is therefore normally a native regression too. Conversely, native plugin/permission behavior can differ even when the shared `out/` code is identical.

## Required Agent Workflow

Before editing, run:

```bash
npx tsx scripts/docs/context.ts <target>
```

The Context Pack always repeats the five-surface rule and adds direct runtime evidence, related commands, artifacts, configs, environment key names, routes, services, tests and consumers.

Before completion, explicitly answer internally for the change:

- Does Development still behave correctly?
- Does the server-capable Web build/runtime still behave correctly?
- Can the feature still be represented in static `out/`, or is it intentionally server-only with a valid remote API boundary?
- Does Android still work with the static payload and its native layer?
- Does iOS still work with the static payload and its native layer?

## Verification Rules

Use the smallest relevant checks first: targeted tests, `npm run typecheck`, `npm run lint`, and `npm run architecture:check`. Use `npm run build` for the server/web release gate when appropriate.

Do **not** run `npm run build:static` merely as a generic check: it overwrites the release `out/` bundle. Run static/native release build flows only when the task actually requires or authorizes changing that output. Native-specific policies/tests remain authoritative for Android/iOS.

## Sources of Truth

- `package.json` — commands and gate entry points.
- `next.config.ts` — server/static mode differences and API-base behavior.
- `scripts/build-static.ts` and `@asol/ota-core` — static bundle construction and validation.
- `capacitor.config.ts` — `webDir: "out"`, native plugin inclusion and live reload.
- `android/` and `ios/` — native platform source/configuration.
- `@asol/native-core` — owned cross-platform native capability.
- `docs/07-mobile-and-release/` — release/deployment/native operational intent.
- `scripts/docs/runtime-knowledge.ts` — machine-readable runtime/artifact mapping used by the Knowledge Graph.
