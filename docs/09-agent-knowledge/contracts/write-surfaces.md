# Write Surface Map

## Purpose

Defines the Write Surface Map: every place application code is allowed to persist data, the gateway package that owns each surface, and the risk classification applied when a write appears to happen outside a declared gateway. This turns "does this touch storage" from a manual code-reading exercise into a documented, checkable contract.

## The Declared Gateways

| Gateway | Owns | Enforcement |
|---|---|---|
| `@asol/data-core` | Database access (Drizzle ORM, SQLite locally, Turso in production/remote environments) | ESLint restrictions + vendor ownership registry + native contract tests |
| `@asol/storage-core` | Object storage (R2/S3-compatible) | ESLint restrictions + storage contract tests |
| `@asol/page-save-core` | Page-authored writes (the single highest-risk, user/editor-facing write path) | Single-door check (exactly one export door) + write-surface tests |

Every persistence write in application code must go through one of these three gateways — directly, or through a feature-level composition port that itself calls the gateway. There is no fourth "ad hoc" write surface. See `docs/01-architecture/02-packages/module-isolation-rules.md` for the full package-boundary rules these gateways are enforced under (that document is protected; read it, do not edit it as part of ordinary feature work — see [Protected Docs](./protected-docs.md)).

## `@asol/page-save-core` Is Deliberately Single-Door

Unlike `@asol/data-core` (which has many narrow doors for its many domains) `@asol/page-save-core` exposes exactly one export door. Page-authored content is the surface most directly exposed to end-user/editor input reaching persistent storage, so it gets the narrowest possible interaction surface plus dedicated write-surface tests. Any change that appears to need a second door into page-save is a signal to escalate, not to add one.

## Risk When a Write Appears Unproven

A persistence write that cannot be traced to one of the three gateways above is treated as **high risk by default**, not benign by default:

- it bypasses the ESLint/vendor-ownership/single-door enforcement that keeps each gateway's invariants (schema ownership, storage-contract shape, page-save write-surface tests) intact;
- it is invisible to the graph's owner-level `imports` edges used for change-impact analysis, because the graph models gateway relationships explicitly;
- in static/native runtimes, an unproven write is doubly suspect: Static `out/`/Android/iOS have no local server route handler, so a "direct" write attempted client-side almost always means either a missing remote API call or a write that should not be reachable from that surface at all.

Treat "I can't find which gateway this write goes through" as an escalation trigger (per [Agent Protocol](../agent-protocol.md): "a persistence write appears outside a declared gateway"), not as evidence the write is safe.

## How To Verify a Write Surface

1. Trace the write to its calling module, then to the package/feature that owns that module.
2. Confirm the module imports `@asol/data-core`, `@asol/storage-core`, or `@asol/page-save-core` through a declared door (`package.json` `exports`) — never a deep import.
3. If the write happens inside a feature, confirm the feature-level composition port (`src/features/**-core-ports.ts`) is the only place bridging application code and the gateway's type world.
4. Confirm the surface has a corresponding write-surface/contract test (`test:data-core`, `test:storage-core`, or the page-save write-surface suite as applicable).

## Regeneration

The map is `generated` truth: derived from the graph's owner-level `imports` edges toward `@asol/data-core`, `@asol/storage-core`, and `@asol/page-save-core`, plus route/feature write evidence. Regenerate with:

```bash
npm run docs:generate
# or
npm run architecture:docs
```

Never hand-edit the generated map. If a write surface is missing or misattributed, fix the import/composition wiring in source, then regenerate.

## Verification

```bash
npm run docs:ci
npm run architecture:check
npm run test:data-core       # when the change touches database access
npm run test:storage-core    # when the change touches object storage
```

## Related Documents

- [API Contract Catalog](./api-contracts.md)
- `docs/01-architecture/02-packages/module-isolation-rules.md` (protected)
- [Data Task Template](../templates/data-task.md)
