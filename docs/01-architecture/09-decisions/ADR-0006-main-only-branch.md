# ADR-0006: Fixed Two-Branch Repository Model

## Status

Accepted; superseded topology finalized 2026-09-02.

## Context

GitHub-dispatched agent commands and the permanent `integration` working branch created an unnecessary remote control plane. Agents now share a persistent local gateway that can multiplex commands, coordination, worktrees, checkpoints, and handoffs without creating a GitHub job per operation.

## Decision

1. The only recognized remote branches are `main` and `integration`.
2. `main` remains the production/release branch and is never an agent scratch branch.
3. `integration` is the persistent non-production aggregation branch for verified agent results.
4. Each agent/task receives a local-only worktree and `agent/<agent>/<task>` branch under `/home/hesham/gova-agents`. These task branches must never be pushed.
5. Normal agent work uses `gova-agent-gateway`; GitHub Actions is not the command transport.
6. Verified completion uses the gateway `integration-submit` operation, serialized by an integration ref lock.
7. No third remote ref, wildcard branch namespace, request branch, rescue branch, staging branch, or provider-generated branch is allowed.
8. Promotion from `integration` to `main` is separate and deliberate.

## Enforcement

- `.githooks/pre-push.d/10-main-only` allows only `refs/heads/main` and `refs/heads/integration`.
- `scripts/block-branch-creation.ts` maintains an active GitHub creation ruleset whose only exclusions are those two refs.
- Agent task branches remain local-only.
- `.github/workflows/local-agent-bootstrap.yml` is manual bootstrap/reinstall only.

## Runtime

- Gateway implementation: `tools/local-agent/`.
- Runtime database: `/home/hesham/.local/share/gova-agent-runtime/runtime.sqlite3` (SQLite WAL).
- Agent worktrees: `/home/hesham/gova-agents/`.
- Persistent service: `gova-agent-gateway.service`.

## Consequences

Agent parallelism is local and does not create remote branch sprawl. Any agent can resume another task from persistent checkpoints/handoffs. GitHub is used for the two durable repository refs, not as an RPC bus.
