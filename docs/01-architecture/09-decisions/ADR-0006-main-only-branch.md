# ADR-0006: main Is the Primary Production Branch

## Status

Accepted (2026-08), amended 2026-08-31

## Context

Provider-generated ephemeral branches accumulated with no unique work. Multiple branches complicated remote workspace workflows where unpushed work is lost when containers terminate.

The repository now has one explicitly authorized persistent working branch for ChatGPT. This is a deliberate exception, not a return to unrestricted feature-branch creation.

## Decision

1. **`main` remains the sole production and release branch** and the canonical source of truth.
2. **`agent-request/chatgpt` is the dedicated persistent ChatGPT working branch.** It is reserved for work performed through the connected ChatGPT/OpenAI GitHub integration.
3. Work may be prepared, reviewed, documented, and verified on `agent-request/chatgpt`; it must not be treated as a production or release source.
4. Before starting new work on the ChatGPT branch, synchronize it with the current `main` when necessary. Only intentional, verified changes should later be integrated into `main`.
5. No other persistent working branch is authorized by this decision unless the user explicitly requests one. Ruleset exclusions that technically permit infrastructure branch patterns do not by themselves authorize additional long-lived branches.
6. Local enforcement in `.githooks/pre-push.d/10-main-only` still rejects ordinary local pushes to non-`main` refs. The dedicated ChatGPT branch is operated through the authenticated GitHub integration unless the local hook policy is separately and explicitly amended.
7. The server-side GitHub `main-only` ruleset must continue to permit `main` and the infrastructure pattern containing `agent-request/chatgpt` while blocking unauthorized branch creation.
8. Vercel `gova` production remains linked to `main`; the ChatGPT branch must never replace that production link.
9. GitHub Actions has no general correctness CI. It runs path-filtered docs validation and, for every `main` push, an OIDC-authenticated dispatcher that deploys the pushed revision to all production targets without creating another commit or push. See [github-ci-policy.md](../../07-mobile-and-release/github-ci-policy.md).

Push **to** `main` remains unrestricted (no branch protection, no required checks).

## Dedicated ChatGPT Branch

- Branch: `agent-request/chatgpt`
- Owner/purpose: persistent workspace for ChatGPT-assisted repository work
- Base: `main`
- Production role: none
- Expected lifecycle: long-lived; do not delete as routine cleanup unless the user explicitly requests deletion
- Integration rule: keep work isolated here until it is intentionally promoted to `main`
- Scope: code, tests, documentation, analysis artifacts, and other repository changes requested from ChatGPT

## Consequences

- Positive: `main` stays the production source of truth while ChatGPT has a stable isolated workspace.
- Positive: unfinished ChatGPT work does not need to be mixed into production history.
- Negative: the ChatGPT branch can drift from `main`; synchronization is required before dependent work or promotion.
- Negative: the existing local main-only pre-push hook does not support ordinary local pushes to this branch.
- Provider-generated temporary branches remain undesirable and should be removed after their work is finished.

Hooks that blocked pushes for dirty `public/sync_data` were removed; the preservation requirement remains documented as release policy instead of blocking every push.

## Source Map

- Hook: `.githooks/pre-push.d/10-main-only`
- Dedicated ChatGPT branch: `refs/heads/agent-request/chatgpt`
- Project-wide branch policy: [Scripts and Workflows](../../07-mobile-and-release/scripts-and-workflows.md)
- GitHub CI: [github-ci-policy.md](../../07-mobile-and-release/github-ci-policy.md)

## Related Documents

- [Architecture Tests](../07-enforcement/architecture-tests.md)
- [docs/07-mobile-and-release/](../../07-mobile-and-release/)

## Change Impact

`main` continues to be the only production/release branch. `agent-request/chatgpt` is the single explicitly documented persistent working-branch exception. Other branch creation remains disallowed unless explicitly authorized.

## Invariants

1. Production and releases come only from `main`.
2. Keep `agent-request/chatgpt` dedicated to ChatGPT work.
3. Do not create additional persistent branches without explicit user authorization.
4. Do not connect `agent-request/chatgpt` to the production Vercel deployment.
5. Unpushed commits in ephemeral cloud workspaces can be lost on session end; persistent ChatGPT work should be stored on its dedicated branch.
