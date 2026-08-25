# Docs CI Task

Use when changing `scripts/docs/**`, `.github/workflows/docs.yml`, `scripts/github-ci-policy.ts`, or the document-mutability/dead-docs/coverage tooling itself. Read [Docs CI Contract](../contracts/docs-ci.md) first.

## Context Pack Target Example

```bash
npx tsx scripts/docs/context.ts scripts/docs/docs-ci.ts
```

## Docs To Read

- `docs/09-agent-knowledge/contracts/docs-ci.md`
- `docs/09-agent-knowledge/document-mutability.md`
- `docs/07-mobile-and-release/github-ci-policy.md` (protected — read-only unless authorized)

## Protected Docs May Be Touched?

**Only if the task explicitly changes CI/mutability policy itself.** `docs/07-mobile-and-release/github-ci-policy.md` and this domain's own contracts are protected; use [Protected Doc Change Task](./protected-doc-change-task.md) with authorization. Changing the *implementation* under `scripts/docs/` without changing the policy prose does not require it.

## Runtime Surfaces To Evaluate

Tooling/CI is not an application runtime, but the workflow it gates runs `npm run runtime:check`. Verify that command still succeeds and still covers Development, Web, Static `out/`, Android, and iOS.

## Required Runtime-Compatibility Checks

```bash
npm run runtime:check
```

## Common Risks

- Adding a second GitHub Actions workflow file, a `pull_request_target`/`workflow_dispatch`/`schedule` trigger, or branch protection — forbidden per [GitHub CI Policy](../../07-mobile-and-release/github-ci-policy.md).
- Widening `docs:ci` to run lint/typecheck/full application tests/`architecture:check`'s application gates, or any application build — forbidden per [Docs CI Contract](../contracts/docs-ci.md).
- Weakening the loud-error contract for a mutability/dead-docs violation (a vague message instead of path + reason + remedy).
- Forgetting to keep `scripts/tests/github-ci-policy.test.ts` and `npm run github:ci-policy` green after editing the workflow.

## Relevant Tests/Checks

```bash
npm run docs:check
npm run docs:mutability:check
npm run docs:dead-links
npm run docs:ci
npm run github:ci-policy
npx tsx scripts/tests/github-ci-policy.test.ts
npm run architecture:check
```

## Documentation To Update

`docs/09-agent-knowledge/contracts/docs-ci.md`, only with authorization, if the policy itself changed. A pure implementation fix that preserves behavior does not require a documentation update.

## Forbidden Unless Explicitly Requested

- A second workflow file, or a forbidden trigger/branch-protection change.
- Running `npm run build`/`build:static`/deploy/OTA from inside docs-CI tooling changes.
- Browser/preview/computer-use verification.
