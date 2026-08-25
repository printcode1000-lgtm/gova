# API Task Template

## Context Pack

```bash
npx tsx scripts/docs/context.ts src/app/api/<route>/route.ts
```

## Docs to read

- `docs/09-agent-knowledge/runtime-contract.md`
- `docs/09-agent-knowledge/document-mutability.md`
- `docs/09-agent-knowledge/contracts/documentation-update-policy.md`
- `docs/09-agent-knowledge/contracts/runtime-compatibility.md`
- `docs/09-agent-knowledge/contracts/api-contracts.md`
- `docs/09-agent-knowledge/contracts/write-surfaces.md`
- owning feature/service docs

## Protected docs may be touched?

**No** for normal API work.

## Runtime surfaces to evaluate

Development + Web for handlers. Static/Android/iOS must keep remote API boundary.

## Required runtime-compatibility checks

```bash
npm run runtime:check:web
npm run runtime:check:static
npm run runtime:check:dev
npm run runtime:check
```

## Common risks

- treating handlers as bundled into out/
- write path bypassing data/page-save/storage gateways
- auth/env leakage

## Relevant tests/checks

```bash
npm run typecheck
npm run lint
npm run architecture:check
npm run runtime:check
npm run docs:ci
```

## Documentation to update

Editable API/feature docs. Regenerate knowledge with `npm run docs:generate`.

## Forbidden unless explicitly requested

- deploy / OTA publish / store release
- destructive database operations
- browser/preview verification
- hand-editing generated docs
- casually editing protected contracts
