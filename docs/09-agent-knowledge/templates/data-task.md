# Data/Schema Task Template

## Context Pack

```bash
npx tsx scripts/docs/context.ts packages/data-core
```

## Docs to read

- `docs/09-agent-knowledge/runtime-contract.md`
- `docs/09-agent-knowledge/document-mutability.md`
- `docs/09-agent-knowledge/contracts/documentation-update-policy.md`
- `docs/09-agent-knowledge/contracts/runtime-compatibility.md`
- - `docs/02-data-and-storage/`
- `docs/09-agent-knowledge/contracts/write-surfaces.md`

## Protected docs may be touched?

**No**, unless changing architecture data-layer contracts under `docs/01-architecture/`.

## Runtime surfaces to evaluate

All five when shared clients consume data contracts; handlers remain Web/Development.

## Required runtime-compatibility checks

```bash
npm run runtime:check
npm run runtime:check:web
npm run runtime:check:static
```

## Common risks

- unproven write surfaces
- schema drift without editable docs
- destructive DB ops

## Relevant tests/checks

```bash
npm run typecheck
npm run lint
npm run architecture:check
npm run runtime:check
npm run docs:ci
```

## Documentation to update

Editable data/storage docs in the same change.

## Forbidden unless explicitly requested

- deploy / OTA publish / store release
- destructive database operations
- browser/preview verification
- hand-editing generated docs
- casually editing protected contracts
