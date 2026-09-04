# Local Agent Disaster Recovery

## Purpose

## Scope boundary

This recovery facility belongs to the **optional Gateway-managed/isolation mode**. Normal direct local-agent editing of `/home/hesham/gova` does not create Gateway task state, task worktrees, or `agent/*` branches, so it does not require this recovery flow. Use this document only when managed runtime recovery was explicitly requested or when recovering historical managed state.

The persistent local-agent runtime has a self-contained recovery command. It is intended to rebuild the execution control plane after repository loss, runtime-database damage, machine replacement, or accidental worktree deletion without using `main` as a recovery channel.

The recovery entry point is:

```bash
gova-agent recovery create /path/to/gova-agent-recovery.tar.gz
gova-agent recovery verify /path/to/gova-agent-recovery.tar.gz
gova-agent recovery restore /path/to/gova-agent-recovery.tar.gz /empty/restore-root
```

`create`, `verify`, and `restore` are local operations. They do not create GitHub branches and do not write `main`.

## What a recovery archive contains

Every archive contains a manifest and SHA-256 checksum map plus the following operational state:

1. A Git bundle created from all local refs. This preserves `integration`, every local-only `agent/<agent>/<task>` branch, their commits, and the committed Local Agent source even if GitHub is unavailable.
2. A consistent SQLite snapshot created with SQLite's backup API. The WAL-backed live database is never copied as a loose file while writes are active. The snapshot preserves agents, tasks, commands, locks, messages, handoffs, checkpoints/events, and other committed runtime rows.
3. Every registered Git worktree's path, HEAD, branch, detached state, Git status, staged binary patch, unstaged binary patch, and safe untracked files. This preserves work that has not reached a commit yet.
4. A required-source inventory for the files needed to reinstall and validate the runtime:
   - `.github/workflows/local-agent-bootstrap.yml`
   - `tools/local-agent/gateway.py`
   - `tools/local-agent/cli.py`
   - `tools/local-agent/monitor.py`
   - `tools/local-agent/recovery.py`
   - `tools/local-agent/git_credential.py`
   - `tools/local-agent/install.sh`
   - `tools/local-agent/gova-agent-gateway.service`
   - `tools/local-agent/selftest.py`
   - `tools/local-agent/codex_test.py`
   - the Local Agent runtime and recovery documentation.
5. The exact `integration` and observed `main` commit SHAs at archive creation time.

Command output logs are not required to restart the runtime and are excluded by default. They can be added explicitly with `--include-logs` when diagnostic history is needed.

## Deliberate secret exclusions

The recovery bundle is operationally complete but does not copy credentials. The following are intentionally excluded:

- `/home/hesham/.config/gova-agent/auth`
- GitHub/API tokens
- `.env` and environment-secret files
- Codex credentials or the Codex binary
- GitHub Runner credentials
- SSH/GPG credentials
- `node_modules`
- installed copies under `~/.local/lib/gova-agent`, the desktop launcher, and installed systemd units.

Those installed files are reproducible from the committed source through `tools/local-agent/install.sh`. If the gateway auth file does not exist after recovery, the installer generates a new key rather than restoring an old credential.

Safe untracked worktree files are copied. Untracked paths with credential-like names, secret/token/password names, environment-file names, or known credential directories are recorded as excluded in `manifest.json` rather than copied silently.

## Verification

`gova-agent recovery verify` performs all of the following before an archive is accepted:

- verifies SHA-256 for every archived payload file;
- confirms the exact `integration` commit exists in `repository.bundle`;
- runs SQLite `PRAGMA integrity_check` on the runtime snapshot;
- verifies the required runtime tables exist;
- verifies the manifest format and reports the number of captured worktrees and required source files.

A bundle that fails verification must not be used for recovery.

## Isolated restore

`restore` requires an empty destination. It never overwrites the live repository, live runtime DB, auth file, or systemd service. It:

1. verifies the archive first;
2. clones the Git bundle into `<target>/repo` and pins that checkout to the captured `integration` SHA;
3. restores the SQLite snapshot to `<target>/runtime/runtime.sqlite3`;
4. rebuilds captured worktrees under `<target>/worktrees/`;
5. reapplies staged changes to the index, reapplies unstaged changes to the working tree, and restores safe untracked files;
6. writes `<target>/RECOVERY.json` with exact follow-up actions.

This isolated behavior is mandatory for recovery testing because a test restore must never disturb the live gateway.

## Returning a recovered copy to service

After an isolated restore has been inspected:

1. stop the live `gova-agent-gateway.service` before replacing a live runtime database;
2. place the chosen recovered repository at the intended canonical location;
3. place the verified recovered SQLite database at the intended runtime location;
4. run `tools/local-agent/install.sh` from the recovered `integration` checkout;
5. let the installer create a fresh gateway auth key when necessary;
6. run `gova-agent health`, `gova-agent diagnostics`, and `gova-agent-monitor --once`;
7. run `python3 tools/local-agent/selftest.py --restart-service` before accepting the recovered control plane.

Codex is an external local worker. Recovery preserves the Codex validation harness but does not copy Codex itself or its ChatGPT credentials. If Codex is installed and authenticated on the replacement host, run `tools/local-agent/codex_test.py` again.

## Branch invariant

Recovery never promotes agent work to `main`. Agent branches remain local-only. Validated work is submitted only to `integration`; `integration -> main` remains a separate intentional release action outside the Local Agent recovery process.
