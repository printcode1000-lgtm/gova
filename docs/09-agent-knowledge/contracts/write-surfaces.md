# Write Surfaces

## Purpose

Defines the write-gateway invariant every persistence-affecting code path must satisfy, and what the generated Write Surface Map verifies. A "write surface" is any source file whose code performs a create/update/delete/upload/save/insert/patch/mutate/publish operation.

## Scope

Applies to `src/**` and `packages/**` source. Does not replace `docs/01-architecture/` gateway/isolation contracts — this document is the discoverability layer over `module-isolation-rules.md`'s door requirement, not a redefinition of it.

## Declared Write Gateways

- `@asol/page-save-core`
- `@asol/data-core`
- `@asol/storage-core`

A write-like source file passes the gateway check when it imports at least one of these. Any other route to persistence is an unproven write surface.

## Generated Evidence

`docs/09-agent-knowledge/generated/reports/write-surface-map.md` (source: `scripts/docs/api-and-write-catalogs.ts`) lists, per detected write-like source file: owner, detected operation verbs, target gateway (or `unproven`), whether the gateway import is proven, related route if any, runtime surfaces, required runtime tests, and a `medium`/`high` risk level (`high` when the gateway is unproven). Regenerate with `npm run docs:generate`; never hand-edit.

## Required Property Of A Safe Write Path

Every write-like operation reaches its target exclusively through one of the declared gateways above. A write path that reaches storage/database directly — bypassing `@asol/data-core`/`@asol/storage-core`/`@asol/page-save-core` — is a module-isolation violation as well as a write-surface violation.

## Common Risks

- A new feature writing directly to a database/storage client instead of importing the owning gateway package.
- An API route handler whose write-like body has no gateway import anywhere in its import closure (see [API Contracts](./api-contracts.md)).
- Duplicated write logic that reimplements gateway-internal behavior instead of calling the gateway's public door.

## Verification

```bash
npm run docs:generate            # regenerate the Write Surface Map
npm run architecture:check       # module-isolation door enforcement
npm run runtime:check
npm run runtime:check:web
npm run runtime:check:static
```

## Related Documents

- [API Contracts](./api-contracts.md)
- Module isolation rules: `docs/01-architecture/02-packages/module-isolation-rules.md`
- [Data/Schema Task Template](../templates/data-task.md)
