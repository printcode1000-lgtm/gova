# UI Task Template

## Context Pack

```bash
npx tsx scripts/docs/context.ts src/features/<feature>/presentation
```

## Docs to read

- `docs/09-agent-knowledge/runtime-contract.md`
- `docs/09-agent-knowledge/document-mutability.md`
- `docs/09-agent-knowledge/contracts/documentation-update-policy.md`
- `docs/09-agent-knowledge/contracts/runtime-compatibility.md`
- - `docs/04-ui-components/touch-interaction-policy.md` (read-only unless authorized)
- matching feature docs under `docs/04-ui-components/` or `docs/05-platform-features/`

## Protected docs may be touched?

**No**, unless the task explicitly changes touch/page-snapshot policy contracts.

## Runtime surfaces to evaluate

All five for shared UI. Dev-only pages: Development + non-leakage into release.

## Required runtime-compatibility checks

```bash
npm run runtime:check
npm run runtime:check:static
npm run runtime:check:dev
npm run runtime:check:web
npm run runtime:check:android
npm run runtime:check:ios
```

## Common risks

- hover/cursor/title regressions
- assuming local App Router APIs exist in out/
- missing editable UI docs update

## Relevant tests/checks

```bash
npm run typecheck
npm run lint
npm run architecture:check
npm run runtime:check
npm run docs:ci
```

## Documentation to update

Editable UI/feature docs only. Do not edit protected UI policy docs without authorization.

## Forbidden unless explicitly requested

- deploy / OTA publish / store release
- destructive database operations
- browser/preview verification
- hand-editing generated docs
- casually editing protected contracts
