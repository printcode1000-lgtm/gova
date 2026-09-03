# GitHub CI Policy

GitHub Actions is not the normal transport for local-agent commands. The persistent local gateway owns command execution, coordination, worktrees, locks, checkpoints, handoffs, and result streaming.

## Allowed workflows

Exactly three workflow files may exist under `.github/workflows/`:

| Workflow | Trigger | Purpose |
|---|---|---|
| `deploy-main.yml` | push to `main` | Production deployment orchestration |
| `docs.yml` | documentation-related push/PR to `main` | Documentation validation |
| `local-agent-bootstrap.yml` | manual `workflow_dispatch` only | Install/reinstall the persistent gateway from `integration` |

`local-agent-bootstrap.yml` runs only on `[self-hosted, Linux, X64, gova]`, reuses the host checkout and toolchain, performs no checkout/setup-node/npm-ci step, consumes no repository secret, and installs `tools/local-agent/install.sh` from `/home/hesham/gova-agents/integration`.

## Normal agent path

After bootstrap, agents call `gova-agent-gateway` directly. A command must not create a GitHub Actions run. Each task gets a local worktree and local `agent/<agent>/<task>` branch. Verified completion is serialized into remote `integration` through the gateway. No task branch is pushed.

## Repository branches

The only remote branches are `main` and `integration`. `main` is production/release. `integration` is non-production aggregation. A repository creation ruleset blocks every other branch.

## Deployment filtering

`deploy-main.yml` excludes `tools/local-agent/**` and documentation/control-only paths because gateway implementation changes do not alter the served application. It also skips `deploy(push): ...` and `deploy(main): ...` commits: those are release-owned commits whose creating command already runs the shared production transaction, so dispatching `deploy:revision` would duplicate the release and contend on the production lock.

The GitHub-linked `gova` Vercel project accepts automatic Git deployments for `main` only. `vercel.json` sets `git.deploymentEnabled` to `{"*": false, "main": true}`; `integration` and every other branch create no Vercel deployment. Do not replace this with an ignored-build command: an ignored build is created and then canceled, which wastes deployment quota on the Hobby account.

## Prohibited

- Any Local Runner workflow other than the manual bootstrap workflow.
- Push/pull-request/schedule/repository-dispatch triggers on the bootstrap workflow.
- GitHub Actions as a per-command RPC mechanism.
- Remote agent task branches or any remote ref other than `main` and `integration`.
- Branch protection or required checks that block direct updates to `main`.
- General application correctness CI.
