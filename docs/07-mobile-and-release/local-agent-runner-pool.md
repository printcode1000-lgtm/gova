# Local Agent Runner Pool

This document is the operating guide for the local agent control plane: the
self-hosted runner pool, the workflows that drive it, and the coordination
channel that lets cloud and local agents work on Gova at the same time.

## Purpose

`/home/hesham/gova` is the Local Runner's primary Gova workspace root. It is the clone used for Git objects, dependencies, runner runtime state, coordination state, and repository worktrees.

It is **not** a host-security boundary. Authenticated full-host-control `shell_command` jobs may change directory outside `/home/hesham/gova` and operate elsewhere on the local server with the operating-system authority of the runner account, including passwordless `sudo` when required.

Repository mutations still use isolated Git worktrees so concurrent agents do not share one mutable checkout. Host-level operations and repository-level isolation are separate concerns; see `local-runner-full-host-control.md` and `local-server-filesystem-boundary.md`.

## Fixed Two-Branch Repository Model

Remote git state is intentionally limited to exactly two branches: `main` and `agent-request/chatgpt`. This is a first-class repository topology, not an exception. The runner pool may create local worktrees and local refs for isolation, but it must never publish a third remote branch. Former `codex/**`, disposable `agent-request/**`, and `agent-control` remote refs are forbidden.

`main` remains the direct-production integration branch. `agent-request/chatgpt` is the permanent ChatGPT workspace and must not be deleted by cleanup or gateway logic.

## Where The Code Lives

The whole system is one sealed package, `@asol/local-agent-core`, with three
doors:

| Door | Covers |
|---|---|
| `@asol/local-agent-core` | agents, locks, requests, worktrees, operation log, memory admission |
| `@asol/local-agent-core/monitor` | the watch model, the pure renderer, remote-host probes |
| `@asol/local-agent-core/host` | runner/systemd inventory and machine-local host-tool policy |

```text
packages/local-agent-core/
  src/                 the modules, plus index.ts / monitor.ts / host.ts as the doors
  src/tests/           npm run test:local-agent-core
  scripts/             watch-window.sh, git-credential-local.sh
scripts/local-agent-*.ts                          the CLIs, thin wrappers around the doors
scripts/tests/local-agent-control-plane.test.ts   npm run test:local-agent-workflows
```

The CLIs stay outside the package on purpose, the same way
`scripts/architecture-check.ts` wraps `@asol/architecture-core`: a sealed package
must not reach back into the repository's own workflows or application data, so
anything that reads those lives in the CLI. That split is also why the test suite
is in two halves — the package's behaviour is tested inside it, and the assertions
that read `.github/workflows` stay in `scripts/tests/`.

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

`GOVA_HOST_PROFILE` selects the runner naming profile. The default is `desktop`,
which preserves the six existing desktop runners. The `laptop` profile uses
globally distinct names for the three runners on `hesham-HP-EliteBook-840-G3`.

| Profile | GitHub name prefix | Runner directories | Services |
|---|---|---|---|
| `desktop` | `gova-local` | `gova-runner` through `gova-runner-6` | `gova-github-runner.service` through `gova-github-runner-6.service` |
| `laptop` | `gova-laptop` | `gova-laptop-runner` through `gova-laptop-runner-5` | `gova-laptop-github-runner.service` through `gova-laptop-github-runner-5.service` |

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

The desktop units run inside `gova-runners.slice`, with `MemoryAccounting=yes`,
`MemoryHigh=7G`, and `MemoryMax=9G`. Per-unit `MemoryMax=4G` contains one
runaway job; the slice bounds the whole pool so six units cannot collectively
authorize more memory than the desktop can survive.

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
| `local-agent-workspace.yml` | `workflow_dispatch` | local isolation only; publishing a third remote branch is forbidden |
| `local-agent-main.yml` | `workflow_dispatch` | serialized direct-`main` mutation |
| `local-agent-coordination.yml` | `workflow_dispatch` | identity, heartbeat, locks, messages, snapshot |
| `local-agent-gateway.yml` | push to permanent `agent-request/chatgpt` | validate request documents and dispatch Local Runner workflows without creating/deleting remote branches |

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

Remote branch-per-agent mutation is disabled by the fixed two-branch repository model. `local-agent-workspace.yml` may use local worktrees for isolation and verification, but it must not publish `codex/**` or any other third remote ref. `local-agent-main.yml` remains the serialized direct-`main` path. ChatGPT uses the persistent `agent-request/chatgpt` branch through the connected GitHub integration.

Local worktrees remain valid because they are machine-local implementation details, not GitHub branches. Parallel agents may isolate filesystem changes locally, but remote publication must converge onto one of the two recognized refs.

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

`shell_command` is executed with `/bin/bash -lc` without a general allowlist.
Antigravity and `agy` are the permanent tool-level exception: requests that
invoke either name are rejected before dispatch or shell execution, and Local
Runner subprocesses also receive refusal shims for both names. Other commands
carry the full local OS authority of the runner user, so callers are responsible
for keeping their output free of secret material.

### How run steps are validated

`npm run github:ci-policy` checks every `run:` in these workflows, and it reads the
two YAML forms differently because they mean different things:

- **`run: <command>`** — one command, which must be on that workflow's allowlist.
  A local agent workflow may only invoke its own apply script.
- **`run: |`** — a shell block. It is a script, not a command, so it is held to the
  forbidden-command list instead: no `npm run build`, no `npm test`, no deploy, no
  `npm ci`.

Reading a block scalar with the single-line expression yields the literal `|`,
which is on no allowlist and was reported as a forbidden command. That is a false
positive, and it failed `architecture:check` — and therefore `npm run build` at
gate 5 of 53 — for every one of the three legitimate shell blocks these workflows
carry. `runValues()` in `scripts/github-ci-policy.ts` separates the two forms, and
`scripts/tests/local-agent-control-plane.test.ts` asserts both that the real
workflows are clean and that a `npm run build` planted inside a block is still
refused.

## Dispatching From A Cloud Agent

Cloud agents must use an existing authenticated surface. They must not create temporary remote branches.

For ChatGPT, the contents-write gateway is the permanent `agent-request/chatgpt` branch. A request document is written under `.agent-control/requests/`; `scripts/local-agent-gateway.ts` accepts that branch only, validates the closed request contract, and dispatches the requested Local Runner workflow using credentials that remain on the host.

The permanent branch is never deleted after processing. Request IDs are recorded in machine-local coordination state and are single-use, so retained request files cannot execute twice. Requests must target `main`, must be fresh enough for the contract, and are rejected if their values look like secret material.

Agents with Actions-write permission may call the supported `workflow_dispatch` surfaces directly. Read-only GitHub access alone cannot execute Local Runner work.

Under the fixed two-branch policy, remote publication from `local-agent-workspace` to a generated `codex/**` branch is not a valid delivery path. Local worktrees remain valid for isolation, but remote delivery must stay on `main` or the permanent `agent-request/chatgpt` request branch as appropriate.

## Agent Coordination

GitHub is the shared coordination surface: cloud agents, local agents, and
agents from other tools all read and write the same records through
`local-agent-coordination.yml`, and read them back from machine-local coordination state; no remote `agent-control` branch. Locally the same actions are available through
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
| `publish` | legacy source path only; blocked by the fixed-two-branch ruleset and not a supported operation |

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

**A lock is stale when its TTL expires, or when the process that took it is
gone — but only if that process was ever meant to outlive the acquisition.**
That distinction is the whole of `processBound`:

| Holder | `processBound` | Stale when |
|---|---|---|
| A mutation job, holding for the life of its run | `true` (default) | TTL expires **or** its pid dies |
| A CLI call, or an agent holding across several commands | `false` | TTL expires |

Without it the lock is worse than useless. The CLI process exits within
milliseconds of printing, so a pid-checked lock is abandoned the moment it is
written — a second agent asking for the same scope is handed it with no conflict
at all. That was verified experimentally: two agents acquired
`packages/simulation-core` simultaneously and neither was told. Any agent that
holds a scope across more than one command must pass `processBound: false`; the
coordination CLI does this for you.

### Messaging

Message kinds are `editing`, `do-not-modify`, `dependency-changed`,
`ready-for-merge`, `conflict-detected`, `lock-released`, and `note`. Bodies are
at most 500 characters and are refused if they look like they carry a
credential, because the channel is republished to GitHub.

Both limits are enforced by refusal, not truncation, and the CLI reports a
refusal as a single line — `coordination refused: <reason>` — rather than an
uncaught stack trace, because the caller is usually another agent parsing the
output.

### Reaching the channel from outside this machine

| The agent has | Supported route |
|---|---|
| A shell on this machine | `npm run local-agent:coordination` |
| GitHub Actions write access | dispatch `local-agent-coordination.yml` |
| GitHub contents write as ChatGPT | write a validated request to permanent `agent-request/chatgpt` |
| Read-only GitHub access | no mutation/coordination write path |

The contents-write gateway accepts `agent-request/chatgpt` only. It never creates or deletes a remote branch. Requests are single-use, time-limited, secret-scanned, and restricted to the closed dispatch contract.

### Coordination state visibility

Canonical coordination state is machine-local under `/home/hesham/gova/.local/github-runners/gova-coordination`. Agents read it through the local CLI or the dispatched status/coordination workflows.

The source tree still contains a legacy `publish` implementation that targets an `agent-control` branch. The active `fixed-two-branches` ruleset prevents creation of that third branch, so this path is not a supported control-plane capability and documentation must not rely on it. Remote repository state remains limited to `main` and `agent-request/chatgpt`.

## Parallelism And Conflict Prevention

Execution isolation is local-first. Repository mutation jobs use machine-local worktrees, while the only recognized remote Git branches remain `main` and `agent-request/chatgpt`.

Direct-`main` mutation is serialized. Other Local Runner jobs may execute concurrently when they are read-only or otherwise admitted by the pool, but they must not publish a third remote ref.

Explicit guards:

| Risk | Guard |
|---|---|
| Two agents editing the same scope | conflicting scope locks are refused |
| Two jobs sharing one mutable checkout | each mutation operates in an isolated local worktree |
| Publishing a third remote branch | active `fixed-two-branches` GitHub ruleset blocks its creation |
| Stale checkout | mutation worktrees start from the freshest `origin/main` |
| Push built on an outdated `main` | pre-push stale-base check refuses when `origin/main` moved |
| Concurrent direct-`main` | GitHub concurrency group plus a single `ref:main` lock |
| Lock leaked by a crash | owning process liveness is checked; TTL remains a backstop |
| Several heavy jobs exhausting memory | admission control plus runner/slice memory limits |
| Record stuck reporting dead work | orphaned operations are reconciled from process liveness |
| Duplicate `request_id` | request ledger refuses a second use |
| Replayed dispatch document | stale requests are refused |
| Secret exfiltration | secret-bearing patches/inspection/messages/request values are refused or redacted |

Every mutation records its starting and resulting SHA.

## Capacity And Termination

### Why this exists

Six runners can each start a job whose `shell_command` pulls in a heavy nested
toolchain. Nothing about the pool stops that, so the machine's out-of-memory
killer settles it instead — and it settles it badly: it sends SIGTERM across the
session, several unrelated jobs die within seconds of each other, and each leaves
behind a held lock, a full worktree, and a record still claiming to be in flight.
Every agent that then wants one of those scopes waits out the stale timeout for a
holder that no longer exists.

This happened. Four concurrent mutations died at once with exit 143 while
`MemAvailable` was below 10% and swap was fully consumed.

### Admission control

Before a mutation touches anything it writes an operation record as `waiting`,
then waits for two conditions. It becomes `running` only once admitted, because a
queued job holds no meaningful memory.

| Setting | Default | Meaning |
|---|---|---|
| `GOVA_AGENT_MEMORY_FLOOR_MB` | unset | explicit memory floor override |
| `GOVA_AGENT_JOB_RESERVE_MB` | 1536 | memory reserved by a newly admitted job |
| `GOVA_AGENT_RESERVATION_MS` | 90000 | how long an admission reservation stays active |
| `GOVA_AGENT_MAX_CONCURRENT_MUTATIONS` | 1 | mutations genuinely running on this machine |
| `GOVA_AGENT_ADMISSION_TIMEOUT_MS` | 900000 | how long to wait before refusing |

Without an explicit floor, healthy swap keeps the floor at `2048MB`. Missing or
exhausted swap raises it to `max(2048MB, round(MemTotal * 0.1) + reserve)`,
matching earlyoom's 10% memory line plus one observed heavy job. Fresh
`running` operations admitted on this host reserve memory for 90 seconds, so
jobs admitted seconds apart cannot all spend the same free megabytes.

Waiting costs an idle runner; not waiting costs four killed jobs. A job that
waits out the timeout is refused before it prepares a worktree, so the agent
simply re-dispatches.

The runner units also carry `MemoryHigh=3G` and `MemoryMax=4G`, so a single
runaway job is throttled inside its own cgroup instead of being resolved at the
expense of the whole session.

### Termination

`scripts/local-agent-main-apply.ts` handles `SIGTERM`, `SIGINT`, and `SIGHUP`.
Node runs no `exit` handler for a default-handled signal, so without this a
killed job would leave all three artefacts behind. The handler releases the
locks, removes the worktree, writes the record as `failed` with `terminatedBy`
set, and exits `128 + signal` — so `143` still reads as SIGTERM to everything
downstream, and a job killed from outside is distinguishable from one that failed
on its own.

### Reconciliation

Two guards catch whatever still slips through:

- **Locks.** A lock records the pid and host that took it. If that host is this
  one and the process is gone, the lock is stale immediately rather than after
  ninety minutes. A pid from another host, or a recycled pid, still falls back to
  the TTL.
- **Operations.** `reconcileOrphanedOperations()` closes out any record left
  `running` by a process that no longer exists, marking it `abandoned`. It runs
  inside admission control and inside `npm run local-agent:cleanup`, so "in
  flight" keeps meaning in flight.

`npm run local-agent:cleanup` also reclaims the worktree of any finished job at
once rather than waiting out the retention window — keeping a full checkout per
killed job is the same disk and memory pressure that caused the problem.

`npm run local-agent:doctor` reports available memory, swap headroom, the
concurrency budget, and the count of reconciled records. The monitor shows the
same memory line in its header, in red once the floor is crossed.

## Nothing Is Lost To Cleanup

`npm run local-agent:cleanup` removes a dead job's worktree with
`git worktree remove --force` followed by an unconditional delete, because a
cleanup that can be blocked is a cleanup that stops running. But the worktrees it
reclaims mostly belong to jobs that were *killed* — by the out-of-memory killer,
by a cancelled run — and killing one mid-edit is exactly when its changes are
worth keeping.

So removal is not the same as destruction. Before the directory goes,
`rescueWorktreeChanges()` runs `git stash create --include-untracked` inside it,
which writes a commit object for the current state without touching the worktree
or the stash list. A worktree shares its object database with the main checkout,
so that commit outlives the directory. It is parked at:

```text
refs/gova-rescue/<worktree-slug>
```

Cleanup reports it in `prunedWorktrees` as `<slug> (rescued to refs/gova-rescue/<slug>)`.

### Recovering rescued work

```bash
git for-each-ref refs/gova-rescue                  # what was saved
git show --stat refs/gova-rescue/<slug>            # what is in it
git show refs/gova-rescue/<slug>:path/to/file      # read one file
git stash apply refs/gova-rescue/<slug>            # restore into the working tree
git update-ref -d refs/gova-rescue/<slug>          # discard once handled
```

A clean worktree produces no ref, so the namespace only ever holds work that
would otherwise have been thrown away. The rescue never throws and never blocks:
if it fails, cleanup proceeds anyway — losing the rescue must not cost the
cleanup.

## Swap Hygiene

Swap that has filled does not empty on its own. Pages written under an earlier
spike stay there long after the pressure passed, so free swap keeps falling
across a working day until it reaches zero — which is exactly the state that
satisfies half of earlyoom's kill condition permanently and forces the admission
floor up from 2048MB to `10% of MemTotal + 1536MB`. On this machine that is the
difference between a 2048MB floor and a 3106MB one, which is roughly one job's
worth of parallelism lost.

The flush is `sudo swapoff -a && sudo swapon -a`. It pulls every swapped page
back into RAM, so it is only safe while RAM can hold them: run it with more
swapped than free and the kernel starts killing processes to make room.

`assessSwap()` answers both questions and never runs anything — swap is system
configuration, and the operator decides when their machine reorganises its
memory:

| Verdict | Meaning |
|---|---|
| `no-swap` | none configured; nothing to flush |
| `healthy` | more than half the swap is free |
| `flush-recommended` | swap is under pressure and RAM has room, with a 1024MB margin |
| `flush-unsafe` | swap is under pressure but a flush would not fit; wait for jobs to finish |

It is reported at the two moments that matter:

- **`npm run local-agent:doctor`** — before starting work, as `memory.swap-flush`,
  carrying the exact command when a flush is safe.
- **`npm run local-agent:cleanup`** — after work ends, in the `swap` field. That
  is the natural moment: nothing is holding those pages any more, and leaving them
  keeps the floor raised for the next batch.

### Growing the swap

A 4GB swap file on a 15.7GB machine refills quickly under a six-runner pool. The
file is `/swap.img` and already listed in `/etc/fstab`. Growing it is a system
configuration change and is done by the operator, not by the control plane:

```bash
sudo swapoff /swap.img
sudo fallocate -l 12G /swap.img     # or: sudo dd if=/dev/zero of=/swap.img bs=1M count=12288
sudo chmod 600 /swap.img
sudo mkswap /swap.img
sudo swapon /swap.img
```

The existing `/etc/fstab` line needs no change — it names the path, not the size.
Confirm with `swapon --show` and `npm run local-agent:doctor`.

## Remote Hosts

`packages/local-agent-core/src/remote-hosts.ts` parses concrete aliases from
`~/.ssh/config`, skipping wildcard patterns. Each alias is probed with one
non-interactive SSH call using `BatchMode=yes` and `ConnectTimeout=6`, then cached
in `.local/remote-hosts.json`.

The probe reports hostname, CPU count, memory, swap, Node version, whether
`~/gova` exists, and registered runner count. Runner count is the number of
`.runner` files under `~/gova/.local/github-runners`, not a name match, because
host profiles use different names. `npm run local-agent:doctor` refreshes the
cache. The monitor only reads the cache, so repaint never waits on SSH and its
only write remains the explicit `a` key.

## Host Tools

Host-tool policy is machine-local and stored at `.local/host-tools.json`. The implementation can prepend refusal shims for `antigravity` and `agy` when the policy disables them.

The current server state was verified on 2026-08-31:

- `antigravity.allowed = true`
- `antigravity` resolves to `/usr/local/bin/antigravity`
- `agy` resolves to `/home/hesham/.local/bin/agy`

Therefore the refusal shims are not an active restriction for authenticated full-host-control jobs. If the machine-local policy is changed later, `local-agent:doctor`/host-tool state must be checked again rather than assuming the current state.

## Host Discovery

Gova no longer depends on the removed `p2p-link` companion-repository relationship. Companion-repository inventory/restore, peer-sync code, and the old P2P sync command are not part of the current Local Runner contract.

Current host discovery is implemented directly inside Gova:

```bash
npm run local-agent:device:discover
```

The command builds a short-lived discovery document from the local host, optionally publishes it to the existing OTA R2 storage surface, and can expose the same document through a password-protected HTTP listener.

Key contract:

- default port `48731`;
- password from `ASOL_DEVICE_DISCOVERY_PORT_PASSWORD`;
- port override through `ASOL_DEVICE_DISCOVERY_PORT`;
- R2 key override through `ASOL_DEVICE_DISCOVERY_R2_KEY`;
- default object `host-discovery/<hostname>.json`;
- discovery expiry after 10 minutes;
- published data includes host/runtime/network facts and URL candidates, never the password value;
- `--dry-run` performs no R2 write and opens no listener;
- `--publish-only` writes R2 and exits;
- normal mode listens on `0.0.0.0:<port>` and requires the configured password.

This is a Gova-owned host-discovery facility, not a dependency on an external P2P repository.

## Operation Logs

Each mutation writes one JSON record under `logs/operations/`:

request id, agent id, workflow, target mode and ref, run id, runner name, host,
pid, starting SHA, resulting SHA, changed files, start and completion time,
duration, verification, whether a patch was supplied, whether a shell command was
supplied, lock scopes, stale-lock recovery state and reclaimed ids, retry count,
status, exit code, the failed command when one fails, `terminatedBy` when a signal
ended the job, `abandoned` when reconciliation closed the record out, and
`admissionWaitMs` when the job waited for capacity.

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
  - "packages/local-agent-core/**"
  - "scripts/local-agent-*.ts"
  - "docs/**"
  - "note/**"
  - ".agents/**"
  - ".vscode/**"
  - "AGENTS.md"
  - "CLAUDE.md"
  - "GEMINI.md"
  - "README.md"
```

A push deploys only when it can change what production serves. Control-plane
changes are operational, and documentation and agent instructions are never
shipped at all — during an active session those are most of the pushes, and each
one used to start a release that then fought the previous one for the
single-deploy lock. The push trigger itself stays, because
`npm run github:ci-policy` requires it.

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
| `npm run local-agent:watch` | live monitor in this terminal |
| `npm run local-agent:watch:window` | live monitor in its own window |
| `npm run local-agent:coordination -- --action=status` | agents, locks, messages |
| `npm run local-agent:cleanup` | reclaim stale locks, worktrees, and old records |
| `npm run local-agent:dispatch:check -- <file>` | validate a request document |
| `npm run local-agent:host:backup` | capture the host configuration that lives outside the project |
| `npm run local-agent:host:restore` | replay that configuration onto a rebuilt machine |
| `npm run test:local-agent-core` | the package's own regression and adversarial tests |
| `npm run test:local-agent-workflows` | the workflow-policy half, which reads `.github/workflows` |

## Host Backup And Recovery

The repository can always be recloned. The parts of the local server that live
*outside* it cannot: the systemd user units, linger, the runner registrations,
each runner's `.env` and `.path`, and the companion repositories that join this
machine to the others. `npm run local-agent:host:backup` captures exactly those
into `config/local-agent-host/`, which is tracked — so the recovery material
travels with the git remote instead of dying with the disk.

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

## Live Monitor

```bash
npm run local-agent:watch:window
```

Opens a window showing what the pool is doing right now: each runner with its
systemd state, its GitHub state, and the workflow and job it is currently
executing with elapsed time; every declared agent with its liveness, heartbeat
age, task, branch, and reserved scopes; every held lock with its holder and age;
mutations queued or in flight with their runner and elapsed time; recent
operations with status, duration, and `SHA→SHA`; the coordination messages; the
gateway request ledger; host-tool policy; and cached remote-host probes.

### It cannot get in the way

The monitor is a reader except for the explicit `a` key that toggles
`.local/host-tools.json`, outside the coordination directory. It takes no lock,
declares no agent, refreshes no heartbeat, writes no record, and dispatches no
job, so it never appears in the state it reports and never competes for a runner
slot. A regression test renders a frame and asserts the coordination channel is
byte-identical afterwards.

It is also cheap. Local change arrives through inotify rather than polling, so an
idle pool costs an idle process; the only timer is a three-second repaint for
elapsed counters. GitHub is asked every 15 seconds with conditional requests, so
an unchanged answer returns `304` and costs no rate-limit budget. It never runs
`git fetch`: `origin/main` is whatever the last agent job already brought down,
which also keeps it from racing a job that is mid-fetch. Secret-bearing paths are
never read.

### Running it

| Command | Effect |
|---|---|
| `npm run local-agent:watch` | live, in the current terminal — works over SSH and inside tmux |
| `npm run local-agent:watch:window` | its own window, sized and titled |
| `npm run local-agent:watch -- --once` | print one frame and exit; this is what tests and scripts use |
| `npm run local-agent:watch -- --offline` | local sources only, zero network |
| `npm run local-agent:watch -- --github-interval=30000` | slow the GitHub timer down (minimum 5s) |
| `bash packages/local-agent-core/scripts/watch-window.sh --install-desktop` | add a launcher to the applications menu |

Keys: `1`–`9` focus one panel, `esc` show them all, `p` pause, `o` toggle the
GitHub reads, `c` copies the current frame without colour escapes and always
writes `.local/monitor-frames/frame-*.txt`, `a` toggles Antigravity inclusion,
and `q` quits.

The window wrapper picks the first terminal emulator that is actually installed —
`gnome-terminal`, `konsole`, `xfce4-terminal`, `x-terminal-emulator`, `xterm` —
and tells you to run the monitor directly if none is present. That fallback
matters: the monitor is an ordinary terminal program, so the absence of a desktop
never makes it unavailable.

## Recovery Procedures

**A runner is down.** `systemctl --user restart gova-github-runner-<n>.service`,
then confirm with `npm run local-agent:doctor`.

**A lock is stuck.** If its owning process is gone it is already stale and the
next acquisition reclaims it. Otherwise it expires after
`GOVA_AGENT_STALE_LOCK_MS`. To reclaim now:
`npm run local-agent:coordination -- --action=recover-stale-locks`.

**Jobs died with exit 143.** That is SIGTERM, not a code failure — a job timeout,
a cancelled run, or the machine's out-of-memory killer. Check
`npm run local-agent:doctor` for memory and swap headroom, then
`npm run local-agent:cleanup` to reconcile records and reclaim locks and
worktrees. Lower `GOVA_AGENT_MAX_CONCURRENT_MUTATIONS` or raise
`GOVA_AGENT_MEMORY_FLOOR_MB` if it recurs.

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
   `desktop` profile's `size` in `HOST_PROFILES`
   (`packages/local-agent-core/src/paths.ts`). Every name — directory, service and
   GitHub — is derived from the profile, so one number covers all three.
5. Add the row to the Runner Pool table above.
6. Confirm with `npm run local-agent:doctor`.

No workflow changes are needed: jobs target the `gova` label, not a runner name.
