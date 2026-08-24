# Agent Protocol

## Goal

Prevent unsafe edits caused by incomplete repository context. Every implementation task starts with impact discovery, not with code editing.

## Before Editing

1. Run `npx tsx scripts/docs/context.ts <target>` with the narrowest meaningful target: exact file, directory, package name, feature, service, route, or capability term.
2. Confirm the owner. For `@asol/*` work, the owning package and its declared exports are binding.
3. Read every item under **Read First**. These are intentionally ranked, not a generic documentation dump.
4. Inspect **Dependencies / Consumers** and **Change Impact**. Treat downstream consumers as part of the task's safety boundary.
5. Identify runtime targets: browser, server, service, Android/iOS static bundle, tooling, or multiple targets.
6. Identify mandatory gateways: database, object storage, native APIs, page-authored writes, notifications, OTA, and other architecture-owned infrastructure.
7. Identify the targeted test surface before writing code.

## During Editing

- Edit the owner, not a convenient bypass location.
- Preserve public doors and dependency direction unless the task explicitly changes the architecture.
- Keep one responsibility per file.
- Update intentional docs in the same change when behavior, API/data contracts, architecture, configuration, or operations change.
- Never manually repair a generated catalog. Change its source and regenerate.
- Keep sensitive runtime values out of documentation and generated indexes.

## Before Completion

Run the cheapest relevant checks first and fix failures before moving on:

```bash
npm run typecheck
npm run lint
npm run architecture:check
```

Run the tests listed by the context pack plus any tests added by the change. Use `npm run build` for the full release gate when appropriate.

Regenerate generated knowledge when the change affects graph facts:

```bash
npm run architecture:docs
```

Then ensure `npm run architecture:check` remains green.

## Escalation Rules

Inspect deeper when any of these are true:

- The target has multiple plausible capability owners.
- A source import cannot be resolved to a known package/feature/service.
- A change crosses browser/server/native/service boundaries.
- A persistence write appears outside a declared gateway.
- A generated fact contradicts an intentional document.
- A document describes a path or package that no longer exists.

In a conflict, live code and enforced registries establish **what is**, while intentional docs and ADRs establish **what should be**. A mismatch is a defect to resolve, not permission to pick the more convenient version.
