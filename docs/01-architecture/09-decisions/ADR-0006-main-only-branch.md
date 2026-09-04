# ADR-0006: Fixed Two-Branch Repository Model and Explicit Agent Execution Choice

## Status

Accepted; local-agent execution policy revised 2026-09-04.

## Context

The repository must keep remote branch sprawl under control while allowing the user to choose direct local work or managed isolation per task. Earlier revisions made one execution path implicit, which could either add unwanted indirection or modify the files the user was inspecting without an explicit mode choice.

## Decision

1. The only recognized remote branches are `main` and `integration`.
2. `main` remains the production/release branch and `/home/hesham/gova` is the canonical local checkout.
3. Before its first task action, every local agent asks the user to choose mode A or B unless the user already selected one in the task.
4. Mode A is Gateway-managed isolation: Gateway requires one constrained GitHub dispatch of the self-hosted bootstrap before it permits the task worktree under `/home/hesham/gova-agents`, local `agent/*` branch, state/locks, and verified submission to `integration`. The selection authorizes those steps but not deployment or another remote branch.
5. Mode B edits `/home/hesham/gova` directly in its current branch and working tree while preserving pre-existing local changes. It does not create a worktree, `agent/*` branch, Gateway task/session, lock/checkpoint/handoff, integration submission, commit, push, or deployment.
6. GitHub `workflow_dispatch` through `.github/workflows/local-agent-bootstrap.yml` is the primary remote bootstrap/entry path to prepare or recover the local device.
7. The bootstrap installs from `/home/hesham/gova` and must not create or reset an integration worktree.
8. `integration` is used only by the explicitly selected Mode A; no third remote ref, wildcard branch namespace, request branch, rescue branch, staging branch, or provider-generated branch is allowed.

## Enforcement

- `.githooks/pre-push.d/10-main-only` allows only `refs/heads/main` and `refs/heads/integration`.
- `scripts/block-branch-creation.ts` keeps the remote two-branch rule.
- `scripts/github-ci-policy.ts` requires the bootstrap to use `/home/hesham/gova` and rejects integration-worktree bootstrap behavior.
- Agent instruction surfaces require an explicit A/B execution choice and prohibit steps outside the selected mode.

## Optional managed runtime

The implementation under `tools/local-agent/`, the runtime database under `/home/hesham/.local/share/gova-agent-runtime/`, and `gova-agent-gateway.service` are retained. They are activated by explicit Mode A selection.

## Consequences

The user chooses between direct local editing and managed isolation for each task. GitHub remains a reliable bootstrap entry point while the two-remote-branch boundary stays fixed.
