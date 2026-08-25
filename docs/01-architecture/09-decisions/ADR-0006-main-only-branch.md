# ADR-0006: main Is the Only Branch

## Status

Accepted (2026-08)

## Context

Provider-generated ephemeral branches accumulated with no unique work. Multiple branches complicated remote workspace workflows where unpushed work is lost when containers terminate.

## Decision

1. **`main` is the sole branch** for all development and release
2. Local enforcement: `.githooks/pre-push.d/10-main-only` rejects pushes to refs other than `refs/heads/main`
3. Server-side: GitHub `main-only` ruleset may block branch *creation* and must exclude `refs/heads/main`
4. Agents commit and push directly to `main` — no feature branches and no required pull requests
5. Vercel `gova` production linked to `main` — renaming the branch would break the deploy link
6. GitHub Actions is docs-focused (path-filtered to documentation/agent/docs tooling). Ordinary code-only pushes run no GitHub CI. See [github-ci-policy.md](../../07-mobile-and-release/github-ci-policy.md).

Push **to** `main` is unrestricted (no branch protection, no required checks).

## Consequences

- Positive: Single source of truth; cloud agents push immediately when done
- Negative: No PR review workflow; relies on local build gates as reviewer
- Pre-push hook only runs when `core.hooksPath` points at `.githooks` (npm `prepare`)

Hooks that blocked pushes for dirty `public/sync_data` were removed; the preservation requirement remains documented as release policy instead of blocking every push.

## Source Map

- Hook: `.githooks/pre-push.d/10-main-only`
- Project-wide branch policy: [Scripts and Workflows](../../07-mobile-and-release/scripts-and-workflows.md)
- GitHub CI: [github-ci-policy.md](../../07-mobile-and-release/github-ci-policy.md)

## Related Documents

- [Architecture Tests](../07-enforcement/architecture-tests.md)
- [docs/07-mobile-and-release/](../../07-mobile-and-release/)

## Change Impact

Creating branches fails server-side ruleset and local hook. Cloud agents MUST `git push -u origin HEAD:main` as final step.

## Invariants

1. Do not `git checkout -b` for feature work.
2. Do not push refs other than `main`.
3. Unpushed commits in cloud workspaces are lost on session end.
