# Docs CI Task Checklist

Use for changes to the documentation-validation tooling itself (`scripts/docs/`, `.github/workflows/docs.yml`) or to the mutability/coverage registries it enforces.

## Context Pack Target Example

```bash
npx tsx scripts/docs/context.ts scripts/docs/check.ts
```

## Docs To Read First

- `docs/09-agent-knowledge/contracts/docs-ci.md`
- `docs/09-agent-knowledge/document-mutability.md`
- `docs/07-mobile-and-release/github-ci-policy.md` (protected, read-only)
- `docs/09-agent-knowledge/generation-and-drift.md`

## Protected Docs: May They Be Touched?

**Usually no** for `docs/09-agent-knowledge/contracts/docs-ci.md` and `github-ci-policy.md` unless the task explicitly changes the docs-CI contract itself (then use [Protected Doc Change Task](./protected-doc-change-task.md) with authorization). Changes to the underlying `scripts/docs/` tooling are code changes, not documentation changes, but they must keep the protected contract's description accurate.

## Runtime Surfaces To Evaluate

Documentation tooling is a `tooling` execution context, not one of the five application surfaces — but confirm any change does not accidentally weaken the five-runtime contract validation (`validateGraphContract`'s mandatory runtime-node/route-exclusion checks).

## Required Runtime-Compatibility Checks

Not applicable to the tooling itself; confirm instead that the tooling still enforces the five-surface contract correctly:

```bash
npm run architecture:check
```

## Common Risks

- Weakening `npm run docs:mutability:check`/`npm run docs:ci` so a protected-path violation stops failing loudly.
- Adding a second GitHub Actions workflow file, or a `pull_request`/`schedule`/`workflow_dispatch` trigger — forbidden regardless of how documentation-related it looks (see [GitHub CI Policy](../../07-mobile-and-release/github-ci-policy.md)).
- Wiring `docs:ci`/`docs:mutability:check` to run lint, typecheck, tests, or an application build — out of scope by design.
- Changing `document-mutability.json`'s required-protected-entry list without updating `docs/09-agent-knowledge/contracts/protected-docs.md`'s table in the same change.
- Silently changing the authorization marker/environment-variable name away from `[docs-contract-change]`/`DOCS_CONTRACT_CHANGE`.

## Relevant Tests/Checks

```bash
npm run docs:check
npm run docs:mutability:check
npm run docs:ci
npm run architecture:check
npm run github:ci-policy
```

## Documentation To Update

- `docs/09-agent-knowledge/contracts/docs-ci.md` if trigger/scope/fail-condition behavior changed (protected — requires authorization).
- `docs/09-agent-knowledge/document-mutability.md` and `docs/09-agent-knowledge/contracts/protected-docs.md` if the registry's enforcement behavior changed (protected — requires authorization).

## Forbidden Unless Explicitly Requested

- Adding any GitHub Actions workflow beyond `docs.yml`.
- Applying branch protection or a required status check on `main`.
- Running a deploy/OTA/database operation from within documentation-tooling changes.
