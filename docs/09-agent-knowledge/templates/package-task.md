# Package/Capability Task Template

## Context Pack

```bash
npx tsx scripts/docs/context.ts @asol/<package> OR packages/<package>
```

## Docs to read

- `docs/09-agent-knowledge/runtime-contract.md`
- `docs/09-agent-knowledge/document-mutability.md`
- `docs/09-agent-knowledge/contracts/documentation-update-policy.md`
- `docs/09-agent-knowledge/contracts/runtime-compatibility.md`
- `docs/01-architecture/02-packages/module-isolation-rules.md` (protected)
- capability docs under architecture/reference after regenerate

## Protected docs may be touched?

**Only if** changing package isolation/architecture contracts. Normal package behavior updates use editable docs.

## Runtime surfaces to evaluate

All five when the package is shared. Server-only packages: Development/Web emphasis + no static leak.

## Required runtime-compatibility checks

```bash
npm run runtime:check
npm run architecture:check
npm run test:<package>-core
```

## Common risks

- deep imports
- door/export drift
- missing owner docs coverage

## Relevant tests/checks

```bash
npm run typecheck
npm run lint
npm run architecture:check
npm run runtime:check
npm run docs:ci
```

## Documentation to update

Editable feature/ops docs for behavior; protected architecture docs only when authorized. Regenerate with `npm run docs:generate` / `architecture:docs`.

## Forbidden unless explicitly requested

- deploy / OTA publish / store release
- destructive database operations
- browser/preview verification
- hand-editing generated docs
- casually editing protected contracts
