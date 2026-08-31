# ADR-0006: Fixed Two-Branch Repository Model

## Status

Accepted (2026-08), finalized 2026-08-31

## Context

The repository previously used a main-only policy while local-agent infrastructure temporarily allowed provider and control-plane branch namespaces. That model created branch accumulation and ambiguous branch ownership.

The repository now has a permanent two-branch topology. This is the normal repository model, not an exception model.

## Decision

1. The repository has exactly two recognized remote branches: `main` and `agent-request/chatgpt`.
2. `main` is the canonical production and release branch and the source used by the GitHub-linked Vercel production deployment.
3. `agent-request/chatgpt` is the canonical persistent ChatGPT working branch. It is a first-class project branch, not an exception, temporary branch, gateway branch, or disposable request branch.
4. No third remote branch may be created for any reason. This includes feature branches, pull-request branches, provider-generated branches, `codex/**`, other `agent-request/**` refs, `agent-control`, rescue branches, staging branches, and temporary automation branches.
5. Agents that need isolation may use local git worktrees or unpushed local refs, but remote publication is limited to the two recognized branches.
6. ChatGPT work is prepared on `agent-request/chatgpt`; intentional verified work may later be integrated into `main`.
7. Other agents may work directly against `main` according to project rules. They must never create a remote branch to obtain isolation.
8. The pre-push hook and GitHub repository ruleset must enforce the exact two-ref allowlist. Namespace wildcards are forbidden.
9. Historical filenames or command names containing `main-only` may remain only where renaming would break stable references; their behavior and documentation must implement this two-branch decision.
10. No workflow, tool, MCP, skill, cloud agent, local agent, or automation may weaken this branch model without a new explicit user-authorized contract change.

## Recognized Branches

| Branch | Role | Lifecycle |
|---|---|---|
| `main` | Production, release, canonical integration | Permanent |
| `agent-request/chatgpt` | Persistent ChatGPT/OpenAI working branch | Permanent |

These two branches are peers in repository legitimacy but have different runtime roles. Only `main` is a production/release source.

## Forbidden Remote Refs

Everything except the two exact refs above is forbidden. In particular, the following former patterns are not branch allowances:

- `codex/**`
- `agent-request/**` other than `agent-request/chatgpt`
- `agent-control`
- feature, staging, rescue, temporary, probe, release, or provider-generated branches

## Enforcement

- Local hook: `.githooks/pre-push.d/10-main-only` permits updates only to `refs/heads/main` and `refs/heads/agent-request/chatgpt`; deleting stray unauthorized branches remains allowed.
- GitHub ruleset: active creation rule covers all branches and excludes exactly `refs/heads/main` and `refs/heads/agent-request/chatgpt`.
- Ruleset bypass actors: none.
- Wildcard exclusions are forbidden.

## Consequences

- Positive: branch ownership is deterministic and persistent.
- Positive: ChatGPT has a stable isolated remote workspace without turning the repository into a feature-branch model.
- Positive: branch leaks from tools or agents are rejected server-side.
- Negative: remote branch-per-agent parallelism is intentionally unavailable; parallel isolation must remain local until work is integrated into one of the two recognized refs.

## Source Map

- Local hook: `.githooks/pre-push.d/10-main-only`
- GitHub ruleset administration: `scripts/block-branch-creation.ts`
- Branch allowlist constant: `packages/local-agent-core/src/control-branch-namespaces.ts`
- Operational policy: [Scripts and Workflows](../../07-mobile-and-release/scripts-and-workflows.md)
- GitHub policy: [GitHub CI Policy](../../07-mobile-and-release/github-ci-policy.md)
- Local-agent operations: [Local Agent Runner Pool](../../07-mobile-and-release/local-agent-runner-pool.md)

## Change Impact

Any code or workflow that tries to create a third remote ref is incompatible with the repository contract and must be changed, disabled, or kept local-only.

## Invariants

1. Exactly two remote branches exist: `main` and `agent-request/chatgpt`.
2. Never create a third remote branch.
3. Never treat `agent-request/chatgpt` as temporary or delete it as request cleanup.
4. Production and releases come only from `main`.
5. ChatGPT uses `agent-request/chatgpt` for persistent isolated work.
