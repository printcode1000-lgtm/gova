# GitHub CI Policy

GitHub `workflow_dispatch` through `local-agent-bootstrap.yml` is the primary remote bootstrap/entry path for preparing or recovering the Gova local device. After entry, normal local-agent work edits `/home/hesham/gova` directly. The Gateway is an optional managed/isolation capability and is not the default command path.

## Allowed workflows

Exactly three workflow files may exist under `.github/workflows/`:

| Workflow | Trigger | Purpose |
|---|---|---|
| `deploy-main.yml` | push to `main` | Production deployment orchestration |
| `docs.yml` | documentation-related push/PR | Documentation validation |
| `local-agent-bootstrap.yml` | manual `workflow_dispatch` only | Prepare/recover local-agent infrastructure from the canonical checkout |

`local-agent-bootstrap.yml` runs only on `[self-hosted, Linux, X64, gova]`, reuses the host checkout/toolchain, performs no checkout/setup-node/npm-ci step, consumes no repository secret, and installs `tools/local-agent/install.sh` from `/home/hesham/gova`. It must not create, reset, or depend on `/home/hesham/gova-agents/integration`.

## Normal local-agent path

The default execution target is the existing canonical working tree at `/home/hesham/gova`. An agent preserves pre-existing local changes, edits the requested files directly, runs relevant non-browser verification, and leaves the result local unless the user explicitly requests a Git/release action.

Normal work must not automatically register with `gova-agent-gateway`, create a per-task worktree or `agent/*` branch, use Gateway locks/checkpoints/handoffs, submit to `integration`, commit, push, or deploy.

Gateway-managed isolation and `integration-submit` are explicit opt-in modes only.

## Repository branches

The only remote branches are `main` and `integration`. `main` is production/release. `integration` is available only for explicitly requested aggregation/integration work. A repository creation ruleset blocks every other branch.

## Deployment filtering

`deploy-main.yml` excludes `tools/local-agent/**` and documentation/control-only paths because local-agent tooling changes do not alter the served application. It also skips release-owned deploy commits whose creating command already runs the production transaction.

The GitHub-linked `gova` Vercel project accepts automatic Git deployments for `main` only. `integration` and every other branch create no Vercel deployment.

## Prohibited

- Any Local Runner workflow other than the manual bootstrap workflow.
- Push/pull-request/schedule/repository-dispatch triggers on the permanent bootstrap workflow.
- Treating Gateway registration, task worktrees, or `integration-submit` as automatic local-agent behavior.
- Remote agent task branches or any remote ref other than `main` and `integration`.
- Resetting or replacing `/home/hesham/gova` merely to obtain an isolated workspace.
- Automatic commit, push, integration, or deployment after a normal local edit.
- General application correctness CI.
