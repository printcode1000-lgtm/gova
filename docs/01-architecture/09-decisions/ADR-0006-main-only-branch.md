# ADR-0006: Fixed Two-Branch Repository Model and Explicit Agent Execution Choice

## Status

Accepted; local-agent execution policy revised 2026-09-04.

## Context

The repository must keep remote branch sprawl under control while allowing the user to choose direct local work or managed isolation per task. Earlier revisions made one execution path implicit, which could either add unwanted indirection or modify the files the user was inspecting without an explicit mode choice.

## Decision

1. The only recognized remote branches are `main` and `integration`.
2. `main` remains the production/release branch and `/home/hesham/gova` is the canonical local checkout.
3. Before its first task action, every agent asks the user to choose mode A, B, or C unless the user already selected one in the task.
4. Mode A is Gateway-managed isolation: Gateway requires one constrained GitHub dispatch of the self-hosted bootstrap before it permits the task worktree under `/home/hesham/gova-agents`, local `agent/*` branch, state/locks, and verified submission to `integration`. The selection authorizes those steps but not deployment or another remote branch.
5. Mode B edits `/home/hesham/gova` directly in its current branch and working tree while preserving pre-existing local changes. A cloud Mode-B task explicitly marked `--cloud-bridge` may use the managed infrastructure as transport only: it creates a temporary worktree and local `agent/*` branch, submits its verified task commit to `integration`, and Gateway applies the resulting integration commit directly and unstaged to the canonical checkout. It never commits or pushes `main` and fails closed if the task paths overlap canonical changes or the patch cannot apply. A local Mode-B task does not create a worktree, `agent/*` branch, Gateway task/session, lock/checkpoint/handoff, integration submission, commit, push, or deployment.
6. Mode C is Remote Desktop Commander execution: the authorized Remote Desktop Commander connection is the exclusive transport for every repository/device read, edit, command, test, Git operation, service/process action, build, and separately authorized external-service operation in the task. It works directly in `/home/hesham/gova`, preserves pre-existing changes, and fails closed instead of falling back to A/B, Gateway execution, GitHub Actions, direct cloud tools, or another transport. Gateway may retain Mode-C task metadata for observability but may not execute Mode-C work.
7. GitHub `workflow_dispatch` through `.github/workflows/local-agent-bootstrap.yml` is the primary remote bootstrap/entry path to prepare or recover the local device for Mode A. Mode C does not use a GitHub workflow as an execution channel.
8. The bootstrap installs from `/home/hesham/gova` and must not create or reset an integration worktree.
9. `integration` is used only by explicitly selected managed isolation or cloud-bridge Mode B, or by a separately authorized Git operation executed through Mode C; no third remote ref, wildcard branch namespace, request branch, rescue branch, staging branch, or provider-generated branch is allowed.

## Enforcement

- `.githooks/pre-push.d/10-main-only` allows only `refs/heads/main` and `refs/heads/integration`.
- `scripts/block-branch-creation.ts` keeps the remote two-branch rule.
- `scripts/github-ci-policy.ts` requires the bootstrap to use `/home/hesham/gova` and rejects integration-worktree bootstrap behavior.
- Agent instruction surfaces require an explicit A/B/C execution choice and prohibit steps outside the selected mode. Mode C additionally requires Remote Desktop Commander as the sole execution transport.

## Optional managed runtime

The implementation under `tools/local-agent/`, the runtime database under `/home/hesham/.local/share/gova-agent-runtime/`, and `gova-agent-gateway.service` are retained. They are activated for execution by explicit Mode A selection or explicit cloud-bridge Mode B selection. Mode C may be represented in task metadata but is rejected by Gateway execution guards.

## Consequences

The user chooses among managed isolation, direct editing, and Remote Desktop Commander-only execution for each task. A cloud agent can preserve the direct-local result of Mode B through an explicit bridge, or operate the paired device end-to-end through Mode C. GitHub remains a reliable Mode-A bootstrap entry point while the two-remote-branch boundary stays fixed.
