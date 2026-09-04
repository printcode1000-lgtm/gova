# GitHub CI Policy

GitHub `workflow_dispatch` through `local-agent-bootstrap.yml` is the primary remote bootstrap/entry path for preparing or recovering the Gova local device. It does not select an agent execution mode. Before the first task action, every agent asks the user to select Mode A (Gateway-managed isolation) or Mode B (direct local editing), unless already selected in the task.

## Allowed workflows

Exactly two workflow files may exist under `.github/workflows/`:

| Workflow | Trigger | Purpose |
|---|---|---|
| `docs.yml` | documentation-related push/PR | Documentation validation |
| `local-agent-bootstrap.yml` | manual `workflow_dispatch` only | Prepare/recover local-agent infrastructure from the canonical checkout |

`local-agent-bootstrap.yml` runs only on `[self-hosted, Linux, X64, gova]`, reuses the host checkout/toolchain, performs no checkout/setup-node/npm-ci step, consumes no repository secret, and installs `tools/local-agent/install.sh` from `/home/hesham/gova`. It must not create, reset, or depend on `/home/hesham/gova-agents/integration`.

## Agent execution modes

Mode A registers with Gateway, creates a Mode-A task, and performs exactly one constrained GitHub dispatch of `local-agent-bootstrap.yml` on `main`. The self-hosted runner installs and enables the persistent Gateway, after which Gateway allows the isolated task worktree, local `agent/*` branch, locks, and verified submission to `integration`. The user's Mode A selection authorizes those steps, but never a third remote branch or deployment.

Mode B normally uses the existing canonical working tree at `/home/hesham/gova`, preserves pre-existing local changes, edits the requested files directly, runs relevant non-browser verification, and leaves the result local. It must not register with `gova-agent-gateway`, create a per-task worktree or `agent/*` branch, use Gateway locks/checkpoints/handoffs, submit to `integration`, commit, push, or deploy.

A cloud agent selecting Mode B creates its task with `--cloud-bridge`. Gateway then uses the Mode-A infrastructure solely as a transport bridge: the agent receives a temporary worktree and local `agent/*` branch, runs verification, and submits the task commit to `integration`. Gateway obtains the resulting integration commit and applies that exact patch directly and unstaged to the canonical `/home/hesham/gova` checkout. It never commits or pushes `main`. Before applying, Gateway rejects any overlap between task paths and canonical uncommitted/staged/untracked paths, and it rejects a patch that cannot apply cleanly; both cases are recorded as a blocked projection.

The agent must not proceed until the user chooses A or B when the task does not already state the choice.

## Repository branches

The only remote branches are `main` and `integration`. `main` is production/release. `integration` is available only for explicitly requested aggregation/integration work. A repository creation ruleset blocks every other branch.

## Deployment filtering

No GitHub Actions workflow deploys production. The Git-linked `gova` Vercel project has Git deployments disabled for every branch. Production deployment occurs only through the explicit release commands, including `npm run deploy:all` and `npm run deploy:push:fast`.

## Prohibited

- Any Local Runner workflow other than the manual bootstrap workflow.
- Push/pull-request/schedule/repository-dispatch triggers on the permanent bootstrap workflow.
- Starting local-agent work without an explicit A/B selection, unless the task already contains it.
- Remote agent task branches or any remote ref other than `main` and `integration`.
- Resetting or replacing `/home/hesham/gova` merely to obtain an isolated workspace.
- Automatic commit, push, integration, or deployment after a normal local edit.
- General application correctness CI.
