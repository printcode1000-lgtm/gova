# Runtime Compatibility Contract

## Purpose

Defines the safe, non-publishing checks an agent runs to verify cross-runtime compatibility before completing a change, and the exact reason `npm run build:static` is excluded from that set. Read [Project Runtime Contract](../runtime-contract.md) first — it is the binding, protected five-surface topology; this document is the verification-side companion.

## The Five Surfaces, Restated

Every change is evaluated against **Development, Web, Static `out/`, Android, and iOS**, even when direct graph evidence only touches some of them. See [Project Runtime Contract](../runtime-contract.md) for the full topology, classification rules, and the static/native API invariant. This document does not repeat that matrix; it defines how to check compatibility without side effects.

## Safe, Non-Publishing Checks

The runtime-compatibility check family validates compatibility **without producing or overwriting a release artifact**:

| Command | What it validates | Side effects |
|---|---|---|
| `npm run runtime:check` | Full five-surface compatibility pass for a release-relevant change. | None — read-only analysis/build-dry-run, no artifact publish. |
| `npm run runtime:check:changed` | Scoped pass over only the files changed in the working tree/diff. | None. |
| `npm run runtime:check:dev` | Development-surface guards, local-only code paths, optional Capacitor live-reload wiring. | None. |
| `npm run runtime:check:web` | Server-capable Web surface: App Router server/API behavior, `.next`-targeted concerns. | None. |
| `npm run runtime:check:static` | Static `out/` constraints: no server route-handler dependency, remote API base usage, static-safe imports. | None — does **not** run `build:static`. |
| `npm run runtime:check:android` | Android Capacitor/manifest/permission/plugin coherence against the shared static payload contract. | None — does not build an APK/AAB. |
| `npm run runtime:check:ios` | iOS Capacitor/Info.plist/entitlement/plugin coherence against the shared static payload contract. | None — does not build an archive. |

Use `runtime:check:changed` as the fast default while iterating; run the full `runtime:check` (or the specific per-surface command relevant to the change) before declaring the change complete. These commands are the practical way to fulfil the Agent Protocol's ["Runtime Questions Required for Every Change"](../agent-protocol.md#runtime-questions-required-for-every-change) without side effects.

## Why `build:static` Is Never a Generic Check

`npm run build:static` **overwrites the release `out/` bundle** — the actual artifact that Android and iOS production shells consume. Running it "just to check" a change:

- destroys the previously reviewed static output without an explicit decision to replace it;
- is unnecessary, because `runtime:check:static`/`runtime:check:android`/`runtime:check:ios` validate the same compatibility surface without publishing anything;
- gives a false sense of completeness — a successful static build proves the export succeeded, not that Android/iOS native behavior (permissions, plugins, signing, store policy) is correct.

Only run `build:static` when the task explicitly requires or authorizes changing the release `out/` output (a real static/native release, per [Runtime Contract](../runtime-contract.md) and [Deployment Targets](../../07-mobile-and-release/deployment-targets.md)). This mirrors the same rule already stated in [`AGENTS.md`](../../../AGENTS.md) §2a and §6, and in the [Agent Protocol](../agent-protocol.md).

## When Each Surface's Check Is Required

| Change touches | Required checks |
|---|---|
| Any shared `src/` UI/client code, or a browser-safe package | `runtime:check:web`, `runtime:check:static`, `runtime:check:android`, `runtime:check:ios` — shared code normally reaches all four |
| `src/app/**/route.*` or `src/app/api/**` | `runtime:check:web` only for the handler itself, plus confirmation that no static/native caller depends on it directly (it is excluded from `out/`) |
| `android/` | `runtime:check:android`, plus `runtime:check:static` for the payload it hosts |
| `ios/` | `runtime:check:ios`, plus `runtime:check:static` for the payload it hosts |
| Development-only surface (`src/app/dev/**`, dev-only feature) | `runtime:check:dev`, plus confirmation the change cannot leak into release behavior |
| `next.config.ts`, `capacitor.config.ts`, environment keys, shared packages | All five: `runtime:check` (full pass) |

## Failure Behavior

A `runtime:check*` failure must name the surface, the specific incompatibility (for example: a static/native client depending on a local same-origin API absent from `out/`), and point to [Runtime Contract](../runtime-contract.md) or the relevant native doc for the fix. Missing direct runtime evidence for a surface is an evidence gap the agent must inspect — never treated as proof the surface is unaffected.

## Verification

```bash
npm run runtime:check:changed
npm run runtime:check        # full pass when the change is release-relevant
npm run typecheck && npm run lint && npm run architecture:check
```

Use `npm run build` for the full server/web release gate when required. Never substitute `npm run build:static` for any of the above.

## Related Documents

- [Project Runtime Contract](../runtime-contract.md)
- [Agent Protocol](../agent-protocol.md)
- [Runtime Compatibility Task](../templates/runtime-compatibility-task.md)
- [Deployment Targets](../../07-mobile-and-release/deployment-targets.md)
