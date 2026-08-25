# Runtime Compatibility Task Checklist

Use as the final pass on any change before declaring it complete, or as a standalone task when explicitly asked to verify cross-runtime compatibility.

## Context Pack Target Example

```bash
npx tsx scripts/docs/context.ts <the same target used for the underlying change>
```

Inspect the pack's **Target Runtime Footprint** section specifically; a missing edge is an evidence gap, not proof of safety.

## Docs To Read First

- `docs/09-agent-knowledge/runtime-contract.md`
- `docs/09-agent-knowledge/contracts/runtime-compatibility.md`
- `docs/09-agent-knowledge/agent-protocol.md` ("Runtime Questions Required for Every Change")

## Protected Docs: May They Be Touched?

**No.** This task verifies compatibility against the existing protected runtime contract; it does not change it. If verification reveals the contract itself is wrong or outdated, escalate as a distinct [Protected Doc Change Task](./protected-doc-change-task.md) rather than silently editing it here.

## Runtime Surfaces To Evaluate

All five, every time, explicitly:

- **Development** — does local/cloud dev behavior or Capacitor live reload change?
- **Web** — does server/API/Vercel behavior still work with `.next`?
- **Static `out/`** — can the change be exported, and if it needs server behavior, is the remote API boundary valid?
- **Android** — does the shared static payload still work with Android permissions/plugins/resources/push/signing/store behavior?
- **iOS** — does the shared static payload still work with iOS entitlements/plugins/push/signing/TestFlight/App Store behavior?

## Required Runtime-Compatibility Checks

Pick the commands matching the change's footprint (see [Runtime Compatibility Contract](../contracts/runtime-compatibility.md) "When Each Surface's Check Is Required"):

```bash
npm run runtime:check:changed
npm run runtime:check          # full pass for release-relevant/shared changes
npm run runtime:check:dev      # dev-only surfaces
npm run runtime:check:web
npm run runtime:check:static
npm run runtime:check:android
npm run runtime:check:ios
```

**Never** substitute `npm run build:static` for any of these — it overwrites the release `out/` bundle and is not a generic check.

## Common Risks

- Treating Development/Web success as proof the change works in Static `out/`/Android/iOS.
- Treating "no direct runtime evidence found" as "this surface is unaffected" instead of an evidence gap to inspect.
- A static/native client silently depending on a same-origin API that only exists in Development/Web.
- A native plugin/permission difference between Android and iOS left unverified because the shared `out/` code looked identical.
- Running `build:static` "to be sure," destroying the previously reviewed release artifact.

## Relevant Tests/Checks

```bash
npm run typecheck
npm run lint
npm run architecture:check
```

Use `npm run build` for the full server/web release gate when the change is release-relevant.

## Documentation To Update

- The editable feature/domain doc's "Runtime Surfaces" note, per [Authoring Standard](../authoring-standard.md#runtime-writing-rule), if this pass revealed a runtime implication not yet documented.
- `docs/08-troubleshooting/problems/` if this pass uncovered and fixed a recurring cross-runtime failure.

## Forbidden Unless Explicitly Requested

- Running `npm run build:static`, a store release, or an OTA publish merely to verify compatibility.
- Using browser/preview/computer-use tools to check native behavior.
- Skipping any of the five surfaces because the change "looks web-only."
