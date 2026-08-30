# Local Agent Runner Pool

This document is the operating guide for cloud agents that need to execute work
on the local machine through GitHub Actions.

## Purpose

The local runner pool lets multiple agents work on Gova at the same time without
sharing one mutable checkout. Each runner instance receives one GitHub Actions
job at a time. The project therefore runs six registered local runners so more
than five agents can be active concurrently.

## Runner Pool

| Runner | Local directory | Systemd user service |
|---|---|---|
| `gova-local` | `/home/hesham/github-runners/gova-runner` | `gova-github-runner.service` |
| `gova-local-2` | `/home/hesham/github-runners/gova-runner-2` | `gova-github-runner-2.service` |
| `gova-local-3` | `/home/hesham/github-runners/gova-runner-3` | `gova-github-runner-3.service` |
| `gova-local-4` | `/home/hesham/github-runners/gova-runner-4` | `gova-github-runner-4.service` |
| `gova-local-5` | `/home/hesham/github-runners/gova-runner-5` | `gova-github-runner-5.service` |
| `gova-local-6` | `/home/hesham/github-runners/gova-runner-6` | `gova-github-runner-6.service` |

Every runner uses the `gova` label. Jobs that must run locally target:

```yaml
runs-on: [self-hosted, Linux, X64, gova]
```

The runner service exposes these environment values:

```text
GOVA_LOCAL_WORKSPACE=/home/hesham/gova
GOVA_LOCAL_SECRET_READ=local-only
GOVA_LOCAL_SECRET_EXPORT=forbidden
GOVA_AGENT_COORDINATION_DIR=/home/hesham/github-runners/gova-coordination
```

GitHub Actions jobs use the npm version already available with the configured
Node.js environment. Workflows must not reinstall npm globally on every job.

## Coordination Channel

Agents coordinate through:

```text
/home/hesham/github-runners/gova-coordination
```

Required layout:

| Path | Purpose |
|---|---|
| `inbox/` | Agent-readable coordination notes or instructions. |
| `locks/` | Atomic lock files created by workflows before mutating a target ref. |
| `logs/` | Sanitized runner records. These must not include secrets or patch contents. |
| `logs/operations/` | One rich JSON execution record per mutation run. |

The coordination directory is local to the machine. It is not a project source of
truth and must not be committed.

Mutation locks automatically recover when an existing lock is older than the
configured stale-lock threshold. The default threshold is 90 minutes, which is
longer than the 60-minute mutation job timeout. It can be overridden with
`GOVA_AGENT_STALE_LOCK_MS`.

## Workflows

Use `.github/workflows/local-agent-status.yml` before planning or mutating work.
It is manually dispatched, read-only, local-only, and reports the current local
checkout state plus GitHub runner/run state. Its optional `paths` input accepts
comma-separated or newline-separated workspace-relative paths. Use
`__tracked__` to inspect metadata for up to 10,000 tracked files in one job.

The status workflow delegates reads to:

```text
scripts/local-agent-status.ts
```

The script reports path existence, type, mode, size, modification time, Git
tracking state, branch, local `HEAD`, `origin/main`, clean/dirty status, runner
availability, and recent workflow runs. It never prints file contents. Paths
that look like secrets are marked `secretLike` and their content is always
reported as `redacted`.

Use `.github/workflows/local-agent-inspect.yml` when an agent needs full
workspace visibility instead of status metadata. It is manually dispatched,
read-only, local-only, and can:

- read complete files with `mode=read`;
- search inside up to 50,000 files with `mode=search`;
- list selected files with `mode=list`;
- report Git state with `mode=git`.

The `paths` input accepts explicit workspace-relative paths or `__tracked__`.
The inspect workflow does not run `npm ci`; inspection uses the checked-out
runner tooling directly and avoids dependency-install overhead on every read.
The inspect script writes the full result to the local coordination log under
`/home/hesham/github-runners/gova-coordination/logs/inspect/` and prints only
the output path and byte count to GitHub logs. This avoids GitHub log truncation
while still allowing the local runner job to read thousands of files line by
line. Do not use this workflow to transmit secrets to remote systems.

Use `.github/workflows/local-agent-workspace.yml` for parallel agent work. It is
manually dispatched, runs only on the local runner pool, applies a supplied
base64-encoded git diff, commits it, and pushes an isolated branch named:

```text
codex/agent-<agent_id>-<github_run_id>
```

This is the default workflow for more than one agent. It avoids direct
contention on `main` while preserving each agent's result in GitHub.

Use `.github/workflows/local-agent-main.yml` only for a reviewed direct update to
`main`. It is also manually dispatched and local-only, but it keeps a
workflow-level concurrency group so only one direct `main` writer runs at a
time.

Both workflows delegate file mutation to:

```text
scripts/local-agent-main-apply.ts
```

The script accepts a git diff, rejects secret-bearing file paths, applies the
patch, optionally executes an arbitrary Bash command supplied through
`shell_command`, runs the selected verification command, commits, and pushes.
The shell command runs after the patch is applied and before the selected
verification step, so shell-driven changes are included in verification and in
the resulting commit.

Each mutation writes a unique JSON record under `logs/operations/`. The record
contains the agent id, target mode/ref, run id, runner/host information, PID,
start/completion timestamps, duration, starting/resulting commit SHAs, changed
files, selected verification, whether arbitrary shell was requested, stale-lock
recovery state, final status, exit code, and failed command executable when a
command fails. Shell command text, patch contents, and secret values are not
stored in the record.

## Verification Choices

The built-in verification values are:

| Value | Command |
|---|---|
| `github-ci-policy` | `npm run github:ci-policy` |
| `runtime-check` | `npm run runtime:check` |
| `docs-ci` | `npm run docs:ci` |
| `architecture-check` | `npm run architecture:check` |
| `typecheck` | `npm run typecheck` |
| `lint` | `npm run lint` |
| `none` | No built-in verification command. |

`local-agent-main.yml` and `local-agent-workspace.yml` also accept the optional
`shell_command` dispatch input. Its content is executed with `/bin/bash -lc`
without an allowlist, providing arbitrary local shell execution authority to the
workflow caller.

## Main Push Rules

Parallel agents must push agent branches. A separate review or merge step decides
what lands on `main`.

Direct `main` pushes are allowed only through `local-agent-main.yml` or the
existing local release path. The workflow uses a lock and a concurrency group so
two agents cannot write `main` at the same time.

Agents that need to land multiple independent jobs on `main` must dispatch one
direct-main workflow per job. GitHub queues those jobs behind the same
`asol-local-agent-main` concurrency group, so each job starts from fresh
`origin/main`, applies its own patch, verifies, commits, and pushes before the
next writer begins.

Agents that need maximum parallelism must dispatch `local-agent-workspace.yml`
first. Each job receives an isolated runner checkout and pushes its own
`codex/agent-*` branch. That allows more than five agents to read thousands of
files, edit independently, and publish branch results at the same time while
keeping `main` serialization explicit.

## Secrets

The runner process can read local project secrets because it runs as the
`hesham` user. Agents must treat that as local execution authority, not as
permission to transmit secrets.

Rules:

- Do not print secret values in logs.
- Do not include secret contents in coordination records.
- Do not include secret files in patch inputs.
- Do not add workflows that upload `.env`, private keys, encrypted archives, or
  derived secret material.

The apply script rejects patches that target `.env`, `.secret-archive`,
`.ota/private-key`, or `config/secret-archive` paths. Arbitrary shell execution
has the same local OS authority as the runner user, so callers are responsible
for keeping shell output free of secret material.

## Secret Backup And Restore For Agents

`npm run secrets:backup` is the command that refreshes the portable encrypted
secret archive committed under `config/`. It captures the git-ignored secret
files that the project needs for deployment, mobile release, storage, provider
access, and local production operations. It must be run after secret files are
added, removed, rotated, or repaired.

The command updates:

```text
config/secret-archive-latest.zip.enc
config/secret-archive-latest.zip.enc.private-key.pem
```

These files are encrypted recovery artifacts, not plaintext secrets. They allow
a clean checkout or a new local runner host to restore the required ignored
files without manually reconstructing every provider credential.

`npm run secrets:restore` is the recovery command. It reads the portable archive,
asks for the archive passphrase when interactive, or reads
`ASOL_SECRET_ARCHIVE_PASSWORD` in non-interactive execution. It restores missing
secret files back to their expected local paths.

Agents use these commands in three ways:

1. Before local release or deployment work, run `npm run secrets:verify` to learn
   which required keys or files are present without printing values.
2. If required secrets are missing and the archive password is available locally,
   run `npm run secrets:restore` so the job can continue on the local runner.
3. After a trusted local operator changes secret files, run
   `npm run secrets:backup` and commit the refreshed encrypted archive so future
   runner workspaces can recover the same secret set.

Agents must never paste restored secret values into GitHub logs, workflow
inputs, branch commits, coordination files, or issue comments. The only safe
remote evidence is status such as `present`, `missing`, file size, checksum of an
encrypted archive, command exit code, or a redacted failure message.

## Local Health Checks

Check runner services:

```bash
systemctl --user list-units 'gova-github-runner*' --no-pager
```

Check GitHub runner registration:

```bash
GITHUB_ADMIN_TOKEN=<redacted> gh api repos/printcode1000-lgtm/gova/actions/runners
```

Never print `GITHUB_ADMIN_TOKEN`; the command above documents the endpoint only.
