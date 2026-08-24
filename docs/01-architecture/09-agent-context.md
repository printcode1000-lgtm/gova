# Architecture Context Entry

## Purpose

Connect architecture enforcement to the repository-wide agent context system without duplicating generated ownership or dependency inventories.

## Before an Architecture Change

Run:

```bash
npx tsx scripts/docs/context.ts <target-path-or-capability>
```

For any `packages/*`, composition, dependency, runtime-boundary, infrastructure-owner, or mandatory-gateway change, the context pack automatically promotes these architecture documents into **Read First**:

- `docs/01-architecture/README.md`
- `docs/01-architecture/02-packages/module-isolation-rules.md`
- related generated references under `docs/01-architecture/08-reference/`

## Sources of Truth

Architecture intent remains in this directory. Machine facts come from `packages/architecture-core` registries, package manifests/exports, and live imports. Repository-wide relationships and task context are produced by `scripts/docs/`.

## Verification

`npm run architecture:check` validates both architecture enforcement and the agent-knowledge documentation contract. `npm run architecture:docs` regenerates architecture references and repository-wide agent knowledge in one command.

See [Agent Knowledge System](../09-agent-knowledge/README.md).
