# ADR-0006: main Is the Only Branch

## Status

Accepted (2026-08)

## Context

Ephemeral agent branches (`claude/*`, `cursor/*`) accumulated with no unique work. Multiple branches complicated cloud agent workflows where unpushed work is lost when containers terminate.

## Decision

1. **`main` is the sole branch** for all development and release
2. Local enforcement: `.githooks/pre-push.d/10-main-only` rejects pushes to refs other than `refs/heads/main`
3. Server-side: GitHub `main-only` ruleset blocks branch creation
4. Agents commit and push directly to `main` — no feature branches
5. Vercel `gova` production linked to `main` — renaming branch would break deploy link

Push **to** `main` is unrestricted (no branch protection blocking force push or failing checks — deliberate so releases are never blocked from pushing).

## Consequences

- Positive: Single source of truth; cloud agents push immediately when done
- Negative: No PR review workflow; relies on build gates as reviewer
- Pre-push hook only runs when `core.hooksPath` points at `.githooks` (npm `prepare`)

Removed hooks that blocked push for dirty `public/sync_data` — rule moved to `CLAUDE.md` rule 11 (commit in same change, not gate push).

## Source Map

- Hook: `.githooks/pre-push.d/10-main-only`
- Agent rules: `AGENTS.md` §1 rule 10, `CLAUDE.md` rule 10

## Related Documents

- [Architecture Tests](../07-enforcement/architecture-tests.md)
- [docs/07-mobile-and-release/](../../07-mobile-and-release/)

## Change Impact

Creating branches fails server-side ruleset and local hook. Cloud agents MUST `git push -u origin HEAD:main` as final step.

## Invariants

1. Do not `git checkout -b` for feature work.
2. Do not push refs other than `main`.
3. Unpushed commits in cloud workspaces are lost on session end.
