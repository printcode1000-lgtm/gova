# GitHub CI Policy

GitHub `workflow_dispatch` has exactly two uses. `local-agent-bootstrap.yml` is the primary remote bootstrap/entry path for preparing or recovering the Gova local device. `local-agent-project.yml` is the cloud Mode-B command channel: it carries no work, only the identity of a commit already published on `integration`. Neither selects an agent execution mode. Before the first task action, every agent asks the user to select Mode A (Gateway-managed isolation), Mode B (direct local editing), or Mode C (Remote Desktop Commander-only execution), unless already selected in the task.

## Allowed workflows

Exactly three workflow files may exist under `.github/workflows/`:

| Workflow | Trigger | Purpose |
|---|---|---|
| `docs.yml` | documentation-related push/PR | Documentation validation |
| `local-agent-bootstrap.yml` | manual `workflow_dispatch` only | Prepare/recover local-agent infrastructure from the canonical checkout |
| `local-agent-project.yml` | manual `workflow_dispatch` only | Verify a published `integration` commit on the device and project it into the canonical checkout |

`local-agent-bootstrap.yml` runs only on `[self-hosted, Linux, X64, gova]`, reuses the host checkout/toolchain, performs no checkout/setup-node/npm-ci step, consumes no repository secret, and installs `tools/local-agent/install.sh` from `/home/hesham/gova`. It must not create, reset, or depend on `/home/hesham/gova-agents/integration`.

`local-agent-project.yml` carries the same runner, read-only permission, no-secret, and host-toolchain constraints. It declares exactly the inputs `agent_id`, `task_id`, `goal`, and `integration_sha`, contains one `project` job, invokes no `npm` line of its own, and runs `tools/local-agent/project.sh` from `/home/hesham/gova`. Verification and projection live in that script so the command channel itself stays inspectable: it re-runs `architecture:check`, `docs:ci`, and the change-related `*-core` suites in a detached verification worktree, then calls the local Gateway. The script must never push a Git ref and must refuse a commit that is not an ancestor of `origin/integration`. This is a manual, commit-scoped verification gate, not general application correctness CI.

## Agent execution modes

Mode A registers with Gateway, creates a Mode-A task, and performs exactly one constrained GitHub dispatch of `local-agent-bootstrap.yml` on `main`. The self-hosted runner installs and enables the persistent Gateway, after which Gateway allows the isolated task worktree, local `agent/*` branch, locks, and verified submission to `integration`. The user's Mode A selection authorizes those steps, but never a third remote branch or deployment.

Mode B normally uses the existing canonical working tree at `/home/hesham/gova`, preserves pre-existing local changes, edits the requested files directly, runs relevant non-browser verification, and leaves the result local. It must not register with `gova-agent-gateway`, create a per-task worktree or `agent/*` branch, use Gateway locks/checkpoints/handoffs, submit to `integration`, commit, push, or deploy.

Mode C uses no GitHub Actions workflow as an execution channel. The cloud agent operates the paired Gova device exclusively through Remote Desktop Commander for every project/device read, edit, command, test, Git operation, service/process action, build, and separately authorized external-service operation. If GitHub access is required by the task, the authorized Git operation is executed from the paired device through Remote Desktop Commander, using device-side tooling such as `git` or `gh`; a GitHub connector is not a Mode-C execution substitute. The first device command is `python3 /home/hesham/gova/tools/local-agent/mode_c_preflight.py`. Failure or loss of the Remote Desktop Commander transport stops C instead of falling back to A, B, Gateway execution, or a workflow.

A cloud agent selecting Mode B uses Git as its transport and the self-hosted runner as its projector. It edits in its own cloud checkout, verifies there, pushes its verified work to `integration`, and dispatches `local-agent-project.yml` with the head commit's full SHA. The projected delta is measured from the fork point with `main` rather than from that commit's own parent, so a task that arrived as several commits still lands whole. The `fixed-two-branches` ruleset carries a `creation` rule that excludes `main` and `integration`, and `integration` has no branch protection, so pushing there requires only the write access the agent's repository connection already has. The dispatch is the one step needing `actions: write`; when the agent's connection lacks it, the agent stops after the push and reports the SHA, and an operator runs `tools/local-agent/project.sh` on the device with the same inputs. Neither variant reaches the Gateway over a network. The agent must verify before pushing; the runner re-verifies on the device and refuses rather than repairs, recording the failing command and its output on the Gateway task. A push alone projects nothing unless the head commit opts in: a device-side systemd timer polls `integration` and picks up only a head whose subject starts with `hok_`, exactly once per head. The watcher is a trigger, not a second gate — it runs the same `project.sh` with the same verification, guards, and recorded refusals. Unmarked work sits on `integration` until a dispatch or an operator asks for it. On success the runner calls `/v1/canonical/project`, which requires a cloud-bridge Mode B task and a 40-character SHA that is an ancestor of `origin/integration`, and applies that exact patch directly and unstaged to the canonical `/home/hesham/gova` checkout. `mode-a-bootstrap` is deliberately not a precondition of this path: the guard exists to prove the managed runtime is installed and running, and a request arriving from the local runner is that same proof. The cloud agent never reaches the Gateway over a network, never receives the Gateway key, and never uses the public monitor tunnel. It never commits or pushes `main`. Before applying, Gateway rejects any overlap between task paths and canonical uncommitted/staged/untracked paths, and it rejects a patch that cannot apply cleanly; both cases are recorded as a blocked projection.

The agent must not proceed until the user chooses A, B, or C when the task does not already state the choice.

## Repository branches

The only remote branches are `main` and `integration`. `main` is production/release. `integration` is available only for explicitly requested aggregation/integration work. A repository creation ruleset blocks every other branch.

## Deployment filtering

No GitHub Actions workflow deploys production. The Git-linked `gova` Vercel project has Git deployments disabled for every branch. Production deployment occurs only through the explicit release commands, including `npm run deploy:all` and `npm run deploy:push:fast`.

## Prohibited

- Any Local Runner workflow other than the manual bootstrap and manual projection workflows.
- Push/pull-request/schedule/repository-dispatch triggers on the permanent bootstrap or projection workflow.
- Reaching the Gateway from outside the device, or handing a cloud agent the Gateway key or the public monitor tunnel URL as a work channel.
- Starting agent work without an explicit A/B/C selection, unless the task already contains it.
- In Mode C, executing any project/device operation through a transport other than Remote Desktop Commander, or silently falling back to another mode.
- Remote agent task branches or any remote ref other than `main` and `integration`.
- Resetting or replacing `/home/hesham/gova` merely to obtain an isolated workspace.
- Automatic commit, push, integration, or deployment after a normal local edit.
- General application correctness CI.
