# Deploy/OTA/Release Task Template

## Context Pack

```bash
npx tsx scripts/docs/context.ts scripts/deploy-all.ts OR packages/ota-core OR packages/vercel-deploy-core
```

## Docs to read

- `docs/09-agent-knowledge/runtime-contract.md`
- `docs/09-agent-knowledge/document-mutability.md`
- `docs/09-agent-knowledge/contracts/documentation-update-policy.md`
- `docs/09-agent-knowledge/contracts/runtime-compatibility.md`
- `docs/07-mobile-and-release/deployment-targets.md` (protected)
- `docs/07-mobile-and-release/release-and-secrets.md` (protected)
- editable operational runbooks if present

## Protected docs may be touched?

**Only if** the task explicitly authorizes protected release/deploy contract changes (`[docs-contract-change]` / `DOCS_CONTRACT_CHANGE=1`).

## Runtime surfaces to evaluate

All five plus release artifact topology. Do not execute deploy/publish unless requested.

## Required runtime-compatibility checks

```bash
npm run runtime:check
npm run docs:ci
npm run github:ci-policy
```

## Common risks

- accidental deploy/OTA/store publish
- secret leakage into docs
- treating docs CI as app release CI

## Relevant tests/checks

```bash
npm run typecheck
npm run lint
npm run architecture:check
npm run runtime:check
npm run docs:ci
```

## Documentation to update

Protected docs only with authorization; otherwise editable operational notes only.

## Forbidden unless explicitly requested

- deploy / OTA publish / store release
- destructive database operations
- browser/preview verification
- hand-editing generated docs
- casually editing protected contracts
