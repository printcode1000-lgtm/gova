# Persistent Local Agent Runtime

## Purpose

The Local Runner is a persistent multi-agent execution environment. GitHub Actions is bootstrap/release infrastructure, not the normal command transport.

## Remote branch model

GitHub contains exactly two branches: `main` and `integration`. Agent branches such as `agent/<agent>/<task>` are local-only and must never be pushed. Normal agent completion integrates into `integration`; promotion from `integration` to `main` is a separate deliberate release operation. Local-agent runtime tests and normal agent submissions must not write `main`.

## Local layout

- Canonical checkout: `/home/hesham/gova`
- Agent worktrees: `/home/hesham/gova-agents/<agent>/<task>`
- Integration worktree: `/home/hesham/gova-agents/integration`
- Runtime state: `/home/hesham/.local/share/gova-agent-runtime`
- Runtime database: `runtime.sqlite3` using SQLite WAL
- Command output: `commands/`
- Local client: `/home/hesham/.local/bin/gova-agent`
- Local monitor: `/home/hesham/.local/bin/gova-agent-monitor`

## Gateway

`gova-agent-gateway.service` runs continuously under systemd, restarts automatically, and listens on TCP port `8765`. `/health` is public; all mutation/state APIs require the local gateway key stored outside Git in `/home/hesham/.config/gova-agent/auth`.

The service uses HTTP/JSON because it has very low startup/runtime overhead, works over LAN/Tailscale/private tunnels, and does not require GitHub jobs. Commands run in independent process groups; stdout/stderr are written directly to runtime files, so client disconnects do not terminate work.

## Agent lifecycle

1. Register an agent.
2. Create or resume a task.
3. Create a task worktree from the current `origin/integration` baseline.
4. Acquire narrow path/module locks only when needed.
5. Execute commands directly through the gateway.
6. Checkpoint meaningful state.
7. Commit on the local agent branch.
8. Submit the commit to local integration.
9. The integration path cherry-picks, verifies, and publishes only `integration`.

Agents are peers. Handoff state is stored in SQLite, not model memory.

## Live agent monitor

`gova-agent-monitor` is a read-only view of the persistent SQLite runtime. It shows each known agent, whether it is local or cloud/remote, current status, task, worktree, branch, checkpoint, recent commands, messages, and handoffs. It does not register agents, refresh heartbeats, acquire locks, or dispatch jobs.

Run one snapshot with:

```bash
gova-agent-monitor --once
```

The installer replaces the legacy `local-agent:watch` desktop launcher with the persistent monitor. In an interactive monitor terminal, select an agent with its number and open the detailed view in a separate terminal window. The monitor never relies on GitHub Actions for local state.

Self-test agents use tagged IDs such as `sim-alpha-<tag>`. A successful self-test removes the runtime rows created by that tag after its worktrees and locks have been cleaned, so repeated validation does not fill the monitor with stale simulation agents.

## CLI examples

```bash
gova-agent health
gova-agent register agent-001
gova-agent task-create agent-001 "Refactor notifications" --task-id notifications-refactor
gova-agent workspace-create agent-001 notifications-refactor
gova-agent exec agent-001 'git status --short' --task-id notifications-refactor
gova-agent messages --recipient agent-001
gova-agent locks
gova-agent diagnostics
```

## Locks and recovery

Locks are scoped by kind and name/path and carry leases. Expired locks are recovered automatically at gateway startup or through `gova-agent lock-recover`. The system intentionally does not serialize unrelated agents.

Task/worktree/command/message/handoff state survives gateway restarts. Commands are launched independently of the client request. After gateway restart, command state is reconciled from PID and exit-marker files. After machine reboot, durable task state remains and dead commands are marked interrupted when inspected.

The integration lock serializes only the final integration transaction. If a cherry-pick conflicts, the gateway aborts the cherry-pick, resets the integration worktree to `origin/integration`, records the conflict on the task, and releases the lock. A failed submission therefore does not leave the shared integration worktree dirty.

## Dependency reuse

Worktree creation does not run `npm ci`. When the canonical checkout already has `node_modules`, a new worktree may get a fast symlink to that dependency tree. If a task changes dependency manifests/lockfiles, materialize its own dependencies before running package-manager mutations; do not mutate the shared symlink.

## Real Codex validation

`tools/local-agent/codex_test.py` validates an authenticated local Codex worker as a real gateway agent. The test creates an isolated agent worktree, runs Codex concurrently with a reviewer peer, requires the live monitor to show both a local agent and a cloud probe, records a checkpoint/handoff, validates the exact changed paths, creates a trusted local branch commit, and submits that commit only to `integration`.

On this Ubuntu host, Codex's normal Linux `workspace-write` sandbox cannot execute because Bubblewrap cannot create the required user namespace (`RTM_NEWADDR: Operation not permitted`). The validation harness therefore runs Codex with its internal sandbox disabled for that process, while removing GitHub token environment variables and overriding Git's credential helper and push URL. The model is restricted by task scope to its isolated worktree, and the trusted harness rejects any change outside the exact allowed path before committing or integrating it. This fallback is for the local Codex worker test; it does not grant normal gateway clients a new GitHub publication path.

## systemd

```bash
sudo systemctl status gova-agent-gateway.service
sudo systemctl restart gova-agent-gateway.service
journalctl -u gova-agent-gateway.service -n 100 --no-pager
```

If passwordless system service installation is unavailable, the installer falls back to a user systemd service.

## Bootstrap

`tools/local-agent/install.sh` installs the committed runtime without dependency installation. The legacy GitHub request/workflow transport is not part of normal operation after migration. The committed bootstrap workflow is manual-only (`workflow_dispatch`) and exists only to install or refresh the persistent runtime; it is not the per-command transport.

## Disaster-recovery bundle

Use the self-contained recovery command when the machine, canonical checkout, runtime database, or agent worktrees must be reconstructed:

```bash
gova-agent recovery create /path/to/gova-agent-recovery.tar.gz
gova-agent recovery verify /path/to/gova-agent-recovery.tar.gz
gova-agent recovery restore /path/to/gova-agent-recovery.tar.gz /empty/restore-root
```

The archive preserves the complete committed Local Agent source, all local refs and local-only agent commits, a consistent SQLite backup, and recoverable staged/unstaged/safe-untracked worktree state. Credentials are intentionally excluded and regenerated or reconnected after recovery. The exact archive contract, exclusions, verification procedure, and isolated restore sequence are defined in `docs/06-super-admin-and-operations/local-agent-recovery.md`.

## Failure recovery

- Agent/client disconnect: command continues and logs remain queryable.
- Gateway crash: systemd restarts it; SQLite/task state remains.
- Stale lock: lease recovery removes it.
- Integration conflict: cherry-pick is aborted and the integration worktree is reset cleanly to `origin/integration`; the task records the conflict.
- Uncommitted agent worktree: removal refuses unless explicitly forced; disaster-recovery archives preserve its staged, unstaged, and safe untracked state.
- Handoff: task ownership and notes are persisted and another agent can continue from the same worktree/branch.
