# Local Agent Runner Pool

This document is the operating guide for the local agent control plane: the
self-hosted runner pool, the workflows that drive it, and the coordination
channel that lets cloud and local agents work on Gova at the same time.

## Purpose

`/home/hesham/gova` is the single project root. Everything the control plane
needs at runtime lives beneath it, and every operation — inspection, mutation,
verification, coordination — happens against that one clone.

The pool lets several agents work concurrently without sharing one mutable
checkout. Each runner takes one GitHub Actions job at a time, so six registered
runners mean six agents can be executing simultaneously. Mutating agents work in
isolated git worktrees, so parallelism never means two jobs editing the same
files.

## Filesystem Layout

```text
/home/hesham/gova                              the one real clone; objects, remotes, node_modules
  .local/                                      git-ignored runtime root
    github-runners/
      gova-runner, gova-runner-2 … -6          the six runner installs
      gova-coordination/                       the coordination channel
        agents/                                one record per agent: declaration + heartbeat
        locks/                                 scope locks
        messages/                              short inter-agent notes
        requests/                              the processed-request ledger
        logs/operations/                       one JSON record per mutation run
        logs/inspect/                          full inspection output
    agent-worktrees/
      __main                                   the serialized direct-main worktree
      <agent_id>-<job_id>                      one isolated worktree per branch job
```

`.local/` is listed in `.gitignore`, excluded from `tsconfig.json`, and excluded
from ESLint. Runner binaries, credentials, `_work` checkouts, logs, and every
other runtime file stay out of the repository; only the scripts and workflows
that drive them are committed.

Because the runner pool now lives inside the repository directory, never run
`git clean -fdx` in `/home/hesham/gova`: it would delete the pool along with the
other ignored files. `npm run local-agent:doctor` verifies the pool is intact.

## Runner Pool

| Runner | Local directory | Systemd user service |
|---|---|---|
| `gova-local` | `/home/hesham/gova/.local/github-runners/gova-runner` | `gova-github-runner.service` |
| `gova-local-2` | `/home/hesham/gova/.local/github-runners/gova-runner-2` | `gova-github-runner-2.service` |
| `gova-local-3` | `/home/hesham/gova/.local/github-runners/gova-runner-3` | `gova-github-runner-3.service` |
| `gova-local-4` | `/home/hesham/gova/.local/github-runners/gova-runner-4` | `gova-github-runner-4.service` |
| `gova-local-5` | `/home/hesham/gova/.local/github-runners/gova-runner-5` | `gova-github-runner-5.service` |
| `gova-local-6` | `/home/hesham/gova/.local/github-runners/gova-runner-6` | `gova-github-runner-6.service` |

Every runner uses the `gova` label. Local jobs target:

```yaml
runs-on: [self-hosted, Linux, X64, gova]
```

Each unit is a single self-contained systemd user unit — no drop-in fragments —
exporting:

```text
GOVA_LOCAL_WORKSPACE=/home/hesham/gova
GOVA_LOCAL_SECRET_READ=local-only
GOVA_LOCAL_SECRET_EXPORT=forbidden
GOVA_RUNNER_POOL_DIR=/home/hesham/gova/.local/github-runners
GOVA_AGENT_COORDINATION_DIR=/home/hesham/gova/.local/github-runners/gova-coordination
```

Local agent jobs use the Node and npm already installed for the runner user.
Workflows must not check out the repository, install a Node toolchain, or run
`npm ci`: `/home/hesham/gova` is already the workspace, with its dependencies
already installed. `npm run github:ci-policy` fails if any of those reappear.

## Permanent Workflows

Exactly eight workflows may exist. Anything else — including a temporary probe —
fails `npm run github:ci-policy`.

| Workflow | Trigger | Purpose |
|---|---|---|
| `deploy-main.yml` | push to `main`, control-plane paths excluded | OIDC production deployment |
| `docs.yml` | push/PR on documentation paths | documentation validation |
| `local-agent-status.yml` | `workflow_dispatch` | read-only workspace, pool, and coordination state |
| `local-agent-inspect.yml` | `workflow_dispatch` | read/search/list/git inspection |
| `local-agent-workspace.yml` | `workflow_dispatch` | isolated branch mutation (the default) |
| `local-agent-main.yml` | `workflow_dispatch` | serialized direct-`main` mutation |
| `local-agent-coordination.yml` | `workflow_dispatch` | identity, heartbeat, locks, messages, snapshot |
| `local-agent-gateway.yml` | push to `agent-request/**` | dispatch gateway |

### Status

`local-agent-status.yml` runs `scripts/local-agent-status.ts` directly against
`/home/hesham/gova`. It reports branch, `HEAD`, `origin/main`, clean/dirty state,
per-path metadata, GitHub runner and run state, and the full coordination
snapshot. The optional `paths` input accepts comma- or newline-separated
workspace-relative paths, or `__tracked__` for up to 10,000 tracked files. It
never prints file contents; secret-like paths report `content: "redacted"`.

### Inspect

`local-agent-inspect.yml` runs `scripts/local-agent-inspect.ts` with
`mode=read|search|list|git`. `search` prefers ripgrep and falls back to
`git grep` when ripgrep is not installed, so inspection never dies on a missing
binary. Full output is written to `logs/inspect/` with mode 0600; only the output
path and byte count reach the GitHub log, which avoids truncation and keeps
volume off a surface far more widely visible than this machine. Secret-bearing
paths are reported as redacted and never opened.

### Mutation

`local-agent-workspace.yml` is the default for more than one agent: each job gets
its own worktree and pushes its own branch,

```text
codex/agent-<agent_id>-<request_id | github_run_id>
```

with no concurrency group, because parallelism is the point.

`local-agent-main.yml` is the serialized direct-`main` variant. It carries the
`asol-local-agent-main` concurrency group *and* a `ref:main` coordination lock,
so simultaneous direct-main requests queue and execute one at a time, each
starting from a fresh `origin/main`.

Both delegate to `scripts/local-agent-main-apply.ts`, which:

1. declares the agent and acquires its locks — the target ref plus every path in
   the optional `scopes` input;
2. prepares an isolated worktree pinned to the freshest `origin/main`, with
   `node_modules` symlinked from the main clone so verification needs no install;
3. applies the patch, when one was supplied;
4. runs `shell_command`, when one was supplied;
5. runs the selected verification command;
6. commits and pushes — unless nothing changed, which is a successful
   verification-only run;
7. refuses to push if `origin/main` moved while the job ran, rather than landing
   work built on a stale base;
8. releases its locks and writes the operation record, on every exit path.

The developer's own working tree in `/home/hesham/gova` is never checked out,
reset, or cleaned by an agent job.

#### Worktree isolation

Branch jobs get a worktree named `<agent_id>-<job_id>`, where the job id is the
request id when the gateway supplied one and the GitHub run id otherwise. Keying
on the agent alone would not be enough: an `agent_id` is stable for a whole task,
so a retry or a second request from the same agent would land in the same mutable
directory and reset and clean a run still in flight. The worktree is removed when
the job exits, so per-job isolation does not cost a checkout per run on disk.

Direct-`main` deliberately shares one `__main` worktree. That path is serialized
by a concurrency group *and* a `ref:main` lock, so exactly one job can be inside
it at a time, and reusing it keeps the common case to a fetch and a reset.

Parallelism between different agents is untouched by either rule.

#### Job shapes

All four shapes are valid, and no agent is ever required to send a fake diff.
The same shapes are accepted through a direct `workflow_dispatch` and through the
gateway:

| `patch_base64` | `shell_command` | `verification` | Result |
|---|---|---|---|
| supplied | — | any | patch-only |
| — | supplied | any | shell-only |
| supplied | supplied | any | patch, then shell |
| — | — | not `none` | verification-only; nothing is committed |
| — | — | `none` | refused: the job would do nothing |

Omitting `verification` means the workflow's own default, `github-ci-policy` — so
a request that carries only a commit message is a verification-only run, not an
empty one.

### Verification Choices

| Value | Command |
|---|---|
| `github-ci-policy` | `npm run github:ci-policy` |
| `runtime-check` | `npm run runtime:check` |
| `docs-ci` | `npm run docs:ci` |
| `architecture-check` | `npm run architecture:check` |
| `typecheck` | `npm run typecheck` |
| `lint` | `npm run lint` |
| `none` | No built-in verification command. |

`shell_command` is executed with `/bin/bash -lc` without an allowlist. It carries
the full local OS authority of the runner user, so callers are responsible for
keeping its output free of secret material.

## Dispatching From A Cloud Agent

### With workflow_dispatch API access

Dispatch the workflow directly:

```bash
gh workflow run local-agent-workspace.yml \
  -f agent_id='cloud-alpha' \
  -f commit_message='chore: regenerate catalogs' \
  -f shell_command='npm run docs:generate' \
  -f verification='docs-ci' \
  -f scopes='docs/09-agent-knowledge/generated'
```

### Without workflow_dispatch API access

Push a request document instead. The gateway converts it into a real
`workflow_dispatch`:

```text
cloud agent -> git push agent-request/* -> gateway (local runner) -> workflow_dispatch -> local runner
```

Write `.agent-control/requests/<request_id>.json` on a branch named
`agent-request/<request_id>`, branched from current `main`, and push it. The
branch must come from `main` so it carries the gateway workflow; the gateway
deletes the branch once processed.

```json
{
  "version": 1,
  "requestId": "req-2026-08-30-0001",
  "agentId": "cloud-alpha",
  "workflow": "local-agent-workspace",
  "mode": "workspace",
  "ref": "main",
  "inputs": {
    "agent_id": "cloud-alpha",
    "commit_message": "chore: regenerate catalogs",
    "shell_command": "npm run docs:generate",
    "verification": "docs-ci"
  },
  "createdAt": "2026-08-30T09:00:00Z"
}
```

Validate it before pushing:

```bash
npm run local-agent:dispatch:check -- .agent-control/requests/req-2026-08-30-0001.json
```

Running the command with no argument prints the contract itself, including the
accepted inputs of every dispatchable workflow.

The gateway authenticates with a token that lives on the machine
(`.env.local`), never a GitHub secret and never a workflow input, so no
credential travels through the request channel.

### Request contract

| Field | Rule |
|---|---|
| `version` | `1` |
| `requestId` | 8–64 characters of `[A-Za-z0-9._-]`, starting alphanumeric, single-use |
| `agentId` | 3–48 characters of `[A-Za-z0-9._-]`, starting alphanumeric |
| `workflow` | one of the five dispatchable workflows |
| `mode` | must match the workflow's mode |
| `ref` | `main` |
| `inputs` | string map; only the inputs that workflow accepts |
| `inputs.verification` | one of the verification choices below; defaults to `github-ci-policy` |
| `createdAt` | ISO-8601, at most 30 minutes old and not in the future |

The gateway refuses a request that fails any of these, and records the refusal.

## Agent Coordination

GitHub is the shared coordination surface: cloud agents, local agents, and
agents from other tools all read and write the same records through
`local-agent-coordination.yml`, and read them back from the `agent-control`
branch. Locally the same actions are available through
`npm run local-agent:coordination`.

| Action | Effect |
|---|---|
| `declare` | register identity, task, expected scopes, branch, status |
| `heartbeat` | refresh liveness |
| `lock` | reserve a path, module, or ref |
| `unlock` | release one scope |
| `release-all` | release everything the agent holds |
| `recover-stale-locks` | reclaim every expired lock |
| `message` | post a short note to one agent or to all |
| `status` | read agents, locks, and messages |
| `publish` | republish the snapshot to `agent-control` |

### Identity and work declaration

Every agent has a stable `agent_id` for the duration of its task. Its record
carries the task, the paths or modules it expects to touch, its branch, its
status, and its heartbeat.

### Heartbeats

An agent is `active` under five minutes since its last heartbeat, `idle` beyond
that, and `stale` once its heartbeat TTL (15 minutes by default) expires. Stale
agents are what make automatic recovery safe: their worktrees and locks can be
reclaimed without asking anyone.

### Locks

A lock reserves one scope for one agent. Two scopes conflict when they are equal
or when one path contains the other, so holding `src/app` blocks
`src/app/page.tsx` and vice versa. Kinds are `path`, `module`, and `ref`.
Acquisition is serialized through a registry mutex, so the "does anything
conflict" scan cannot race. A lock older than `GOVA_AGENT_STALE_LOCK_MS`
(90 minutes by default, longer than the 60-minute job timeout) is reclaimed
automatically on the next acquisition attempt. Only the owner may release a live
lock.

### Messaging

Message kinds are `editing`, `do-not-modify`, `dependency-changed`,
`ready-for-merge`, `conflict-detected`, `lock-released`, and `note`. Bodies are
at most 500 characters and are refused if they look like they carry a
credential, because the channel is republished to GitHub.

### Reading state from the cloud

Every coordination action republishes a sanitized snapshot to the
`agent-control` branch as `coordination-status.json`:

```bash
gh api repos/printcode1000-lgtm/gova/contents/coordination-status.json?ref=agent-control
```

The snapshot holds active agents, locks, recent messages, pending and completed
requests, and recent operations. Host names, process ids, filesystem paths,
patch bodies, shell command text, and input values are all excluded.

`agent-control` is an output-only orphan branch, force-updated by git plumbing so
no checkout is disturbed. Coordination traffic never lands on `main`, and pushing
to `agent-control` triggers no workflow at all.

## Parallelism And Conflict Prevention

The default path for any agent that mutates code is its own branch. Direct-`main`
work is the exception, and it is the only serialized path.

Explicit guards:

| Risk | Guard |
|---|---|
| Two agents editing the same scope | conflicting scope locks are refused |
| Overwriting another agent's branch | one branch per `agent_id` + `request_id` |
| Stale checkout | every job resets its worktree to the freshest `origin/main` |
| Push built on an outdated `main` | pre-push check refuses when `origin/main` moved |
| Concurrent direct-`main` | concurrency group plus a single `ref:main` lock |
| Lock leaked by a crash | TTL expiry plus automatic stale-lock recovery |
| Duplicate `request_id` | the request ledger refuses a second use |
| Replayed dispatch document | requests older than 30 minutes are refused |
| Secret exfiltration | secret paths refused in patches, inspection, and messages |

Every mutation records its starting and resulting SHA.

## Operation Logs

Each mutation writes one JSON record under `logs/operations/`:

request id, agent id, workflow, target mode and ref, run id, runner name, host,
pid, starting SHA, resulting SHA, changed files, start and completion time,
duration, verification, whether a patch was supplied, whether a shell command was
supplied, lock scopes, stale-lock recovery state and reclaimed ids, retry count,
status, exit code, and the failed command when one fails.

Never stored: shell command text, patch contents, secret values, `.env` data,
tokens, or credentials. A failed shell step is recorded as the literal
`shell_command`, not as its text.

Records stay local under
`/home/hesham/gova/.local/github-runners/gova-coordination/`. The safe summary
reaches cloud agents through the `agent-control` snapshot.

## Secrets

The runner runs as the machine user and can read local project secrets. That is
local execution authority, not permission to transmit.

- No secret values in logs, coordination records, messages, branch names, or
  request ids.
- No workflow may upload `.env`, private keys, encrypted archives, or derived
  secret material.
- Inspection of a secret-bearing path returns metadata or `redacted`, never
  content.
- `scripts/local-agent-main-apply.ts` and the gateway both refuse patches
  touching `.env*`, `.secret-archive`, `.ota/private-key`,
  `config/secret-archive`, `.vercel/`, or `fastlane/.env`.
- Values matching credential patterns are refused in dispatch inputs and
  messages.

### Secret backup and restore for agents

`npm run secrets:backup` refreshes the portable encrypted archive committed under
`config/`:

```text
config/secret-archive-latest.zip.enc
config/secret-archive-latest.zip.enc.private-key.pem
```

These are encrypted recovery artifacts, not plaintext secrets. `npm run
secrets:restore` reads the archive, asking for the passphrase interactively or
reading `ASOL_SECRET_ARCHIVE_PASSWORD`. `npm run secrets:verify` reports which
keys are present without printing values.

Agents must never paste restored secret values into GitHub logs, workflow inputs,
branch commits, coordination files, or comments. The only safe remote evidence is
status such as `present`, `missing`, a file size, a checksum of an encrypted
archive, an exit code, or a redacted failure message.

## Control-Plane Changes Do Not Deploy

`deploy-main.yml` excludes the control plane from production deployment:

```yaml
paths-ignore:
  - ".agent-control/**"
  - ".github/workflows/local-agent-*.yml"
  - "scripts/local-agent/**"
  - "scripts/local-agent-*.ts"
  - "docs/07-mobile-and-release/local-agent-runner-pool.md"
```

A coordination change alters how agents work on this machine; it does not change
what production serves. `npm run github:ci-policy` fails if any of those entries
is removed. Dispatch requests and coordination updates never touch `main` at all,
so they cannot trigger a deployment in the first place.

## Health Checks

```bash
npm run local-agent:doctor
```

Verifies the workspace, the pool root, all six runner installs, the absence of
the legacy root, coordination directory permissions, the six systemd services and
their working directories, git state, agent worktrees, stale agents, stale locks,
the request ledger, Node and npm, local GitHub connectivity, and the registration
of every dispatchable workflow. It reports PASS, WARN, or FAIL per check and
never prints a credential — the token is reported as present or absent only.

Other commands:

| Command | Purpose |
|---|---|
| `npm run local-agent:status` | full read-only state as JSON |
| `npm run local-agent:coordination -- --action=status` | agents, locks, messages |
| `npm run local-agent:cleanup` | reclaim stale locks, worktrees, and old records |
| `npm run local-agent:dispatch:check -- <file>` | validate a request document |
| `npm run local-agent:host:backup` | capture the host configuration that lives outside the project |
| `npm run local-agent:host:restore` | replay that configuration onto a rebuilt machine |
| `npm run test:local-agent-core` | control-plane regression and adversarial tests |

## Host Backup And Recovery

The repository can always be recloned. The parts of the local server that live
*outside* it cannot: the systemd user units, linger, the runner registrations,
and each runner's `.env` and `.path`. `npm run local-agent:host:backup` captures
exactly those into `config/local-agent-host/`, which is tracked — so the recovery
material travels with the git remote instead of dying with the disk.

`.credentials`, `.credentials_rsaparams`, and `.registration-token` are never
captured. They are registration secrets, and a rebuilt runner registers again
with a fresh token derived from `GITHUB_ADMIN_TOKEN`; replaying an old credential
would be insecure and would not work. Runner `.env` lines that look like
credentials are redacted before being written.

Re-run the backup after adding or removing a runner, editing a unit, changing
labels, or upgrading the runner release. `--dry-run` shows what would be written.

### Rebuilding a machine from nothing

1. Install Node and git; clone the repository to `/home/hesham/gova`.
2. `npm run secrets:restore` — brings back the git-ignored secret files,
   including the token restore needs.
3. `npm ci`
4. `npm run local-agent:host:restore` — recreates the pool root, downloads the
   recorded runner release, registers all six runners with their recorded names,
   labels, and work folders, restores their environment files, installs the
   systemd units, and enables and starts them. Every step is idempotent, so it is
   equally safe on a half-broken machine. `--dry-run` lists the steps first.
5. `loginctl enable-linger $USER` if restore reports it missing. This is the one
   step that can prompt for authentication, so restore never performs it — it
   tells you instead. Without linger the pool stops at logout.
6. `npm run local-agent:doctor` — every check must pass.

Restore never uses `sudo`: the pool is made of systemd *user* units and needs no
system-level privilege.

## Recovery Procedures

**A runner is down.** `systemctl --user restart gova-github-runner-<n>.service`,
then confirm with `npm run local-agent:doctor`.

**A lock is stuck.** It expires on its own after
`GOVA_AGENT_STALE_LOCK_MS`. To reclaim immediately:
`npm run local-agent:coordination -- --action=recover-stale-locks`.

**An agent crashed mid-job.** Its heartbeat goes stale, its locks expire, and
`npm run local-agent:cleanup` reclaims its worktree. Re-dispatch with a new
`request_id`.

**A push was refused because `origin/main` moved.** Rebuild the patch against
current `main` and dispatch a new request; the control plane never force-lands
work built on a stale base.

**A worktree is corrupt.** `npm run local-agent:cleanup` prunes it; the next job
recreates it from `origin/main`.

**The coordination directory is missing.** Every writer recreates it on first
use. Nothing in it is a source of truth.

## Adding A Seventh Runner

1. Install the runner into
   `/home/hesham/gova/.local/github-runners/gova-runner-7` and register it as
   `gova-local-7` with the `gova` label.
2. Create `~/.config/systemd/user/gova-github-runner-7.service` as a copy of an
   existing unit, with `WorkingDirectory` and `ExecStart` pointing at the new
   directory and the same five `Environment=` lines.
3. `systemctl --user daemon-reload && systemctl --user enable --now gova-github-runner-7.service`.
4. Add `gova-runner-7`, `gova-github-runner-7.service`, and `gova-local-7` to the
   three arrays in `scripts/local-agent/paths.ts`.
5. Add the row to the Runner Pool table above.
6. Confirm with `npm run local-agent:doctor`.

No workflow changes are needed: jobs target the `gova` label, not a runner name.
