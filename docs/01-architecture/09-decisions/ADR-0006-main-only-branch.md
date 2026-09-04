# ADR-0006: Fixed Two-Branch Repository Model and Direct Local Editing

## Status

Accepted; local-agent execution policy revised 2026-09-04.

## Context

The repository must keep remote branch sprawl under control while allowing local agents to work naturally against the real device checkout. Earlier revisions made the persistent Gateway, per-task worktrees, and `integration-submit` the normal execution path. That added indirection for ordinary local edits and could move work away from the files the user was actually inspecting.

## Decision

1. The only recognized remote branches are `main` and `integration`.
2. `main` remains the production/release branch and `/home/hesham/gova` is the canonical local checkout.
3. Default local-agent execution edits `/home/hesham/gova` directly in its current branch and working tree while preserving pre-existing local changes.
4. A normal local task does not automatically create a worktree, `agent/*` branch, Gateway task/session, lock/checkpoint/handoff, integration submission, commit, push, or deployment.
5. GitHub `workflow_dispatch` through `.github/workflows/local-agent-bootstrap.yml` is the primary remote bootstrap/entry path to prepare or recover the local device.
6. The bootstrap installs from `/home/hesham/gova` and must not create or reset an integration worktree.
7. `gova-agent-gateway`, `/home/hesham/gova-agents/`, and `integration-submit` remain explicit opt-in capabilities for user-requested managed/isolation or aggregation work.
8. `integration` is used only when the user explicitly requests integration/aggregation; it is not a mandatory completion lane.
9. No third remote ref, wildcard branch namespace, request branch, rescue branch, staging branch, or provider-generated branch is allowed.

## Enforcement

- `.githooks/pre-push.d/10-main-only` allows only `refs/heads/main` and `refs/heads/integration`.
- `scripts/block-branch-creation.ts` keeps the remote two-branch rule.
- `scripts/github-ci-policy.ts` requires the bootstrap to use `/home/hesham/gova` and rejects integration-worktree bootstrap behavior.
- Agent instruction surfaces explicitly prohibit automatic Gateway/worktree/integration/commit/push/deploy transitions.

## Optional managed runtime

The implementation under `tools/local-agent/`, the runtime database under `/home/hesham/.local/share/gova-agent-runtime/`, and `gova-agent-gateway.service` are retained. They do not define the default execution path and are activated for a task only by explicit user intent.

## Consequences

Local agents modify the same files the user sees on the device. GitHub remains a reliable bootstrap entry point. Isolation, multi-agent coordination, and integration transactions remain available without being imposed on ordinary local work.
