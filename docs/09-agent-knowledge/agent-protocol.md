# Agent Protocol

## Goal

Prevent unsafe edits caused by incomplete repository context. Every implementation task starts with impact discovery, ownership discovery, and five-runtime compatibility — not with code editing.

## Permanent Project Context

Before considering the specific task, remember that the application operates through **Development, Web, Static `out/`, Android, and iOS**. These are not five unrelated projects: shared code feeds the web/static build, and production Android/iOS consume the static `out/` payload through Capacitor while adding platform-native behavior.

Read [Project Runtime Contract](./runtime-contract.md). An agent must consider all five on every change, even when the target-specific graph footprint mentions only some of them.

## Before Editing

1. Run `npx tsx scripts/docs/context.ts <target>` with the narrowest meaningful target: exact file, directory, package, feature, service, route, command, environment key, runtime, artifact, or capability term.
2. Read the **Project Runtime Contract** section in the returned pack. It is always present.
3. Confirm the owner. For `@asol/*` work, the owning package and its declared exports are binding.
4. Read every item under **Read First**. These are intentionally ranked, not a generic documentation dump.
5. Inspect **Dependencies**, **Consumers**, **Routes**, **Services**, **Commands**, **Artifacts**, **Configuration**, **Environment Key Names**, **Tests**, and **Change Impact** as applicable.
6. Inspect **Target Runtime Footprint**, then explicitly evaluate compatibility with all five application surfaces. Missing direct runtime evidence is an evidence gap, not proof of non-impact.
7. Identify mandatory gateways: database, object storage, native APIs, page-authored writes, notifications, OTA, deployment, and other architecture-owned infrastructure.
8. Identify focused verification before writing code.

## Runtime Questions Required for Every Change

Internally answer all five before completion:

- **Development:** does local/cloud dev behavior, development guards, or Capacitor live reload change?
- **Web:** does server/runtime/API/Vercel behavior still work with `.next`?
- **Static `out/`:** can the change be exported, and if it needs server behavior is the remote API boundary valid?
- **Android:** does the shared static payload still work with Android permissions/plugins/resources/push/signing/store behavior?
- **iOS:** does the shared static payload still work with iOS entitlements/plugins/push/signing/TestFlight/App Store behavior?

## During Editing

- Edit the owner, not a convenient bypass location.
- Preserve public doors and dependency direction unless the task explicitly changes architecture.
- Never make shared application behavior depend on a local same-origin API that does not exist in static/native production.
- Keep one responsibility per file.
- Update intentional docs in the same change when behavior, API/data contracts, architecture, configuration, runtime compatibility, or operations change.
- Never manually repair a generated catalog. Change its source and regenerate.
- Keep sensitive runtime values out of documentation, generated indexes, command catalogs, and logs.

## Before Completion

Run the cheapest relevant checks first and fix failures before moving on:

```bash
npm run typecheck
npm run lint
npm run architecture:check
```

Run the tests listed by the Context Pack plus tests introduced by the change. Use `npm run build` for the complete web/server release gate when appropriate.

Do not use `npm run build:static` as a generic check because it overwrites the release `out/` bundle. Use static/native build flows only when the task actually requires or authorizes changing that output.

Regenerate generated knowledge when graph facts change:

```bash
npm run architecture:docs
```

Then ensure `npm run architecture:check` remains green.

## Escalation Rules

Inspect deeper when any of these are true:

- The target has multiple plausible capability owners.
- A source import cannot be resolved to a known package/feature/service.
- A change crosses browser/server/static/native/service boundaries.
- The target-specific runtime footprint does not match what the implementation appears to do.
- A static/native client depends on a server route without a valid remote API path.
- A persistence write appears outside a declared gateway.
- A generated fact contradicts an intentional document.
- A document describes a path, package, command, environment key, runtime, or artifact that no longer exists.

In a conflict, live code and enforced registries establish **what is**, while intentional docs and ADRs establish **what should be**. A mismatch is a defect to resolve, not permission to choose the more convenient version.
