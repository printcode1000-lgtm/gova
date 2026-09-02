# Persistent Local Agent Runtime

## Purpose

The Local Runner is a persistent multi-agent execution environment. GitHub Actions is bootstrap/release infrastructure, not the normal command transport.

## Remote branch model

GitHub contains exactly two branches: `main` and `integration`. Agent branches such as `agent/<agent>/<task>` are local-only and must never be pushed. Normal agent completion integrates into `integration`; promotion from `integration` to `main` is a separate deliberate release operation.

## Local layout

- Canonical checkout: `/home/hesham/gova`
- Agent worktrees: `/home/hesham/gova-agents/<agent>/<task>`
- Integration worktree: `/home/hesham/gova-agents/integration`
- Runtime state: `/home/hesham/.local/share/gova-agent-runtime`
- Runtime database: `runtime.sqlite3` using SQLite WAL
- Command output: `commands/`
- Local client: `/home/hesham/.local/bin/gova-agent`

## Gateway

`gova-agent-gateway.service` runs continuously under systemd, restarts automatically, and listens on TCP port `8765`. `/health` is public; all mutation/state APIs require the local gateway key stored outside Git in `/home/hesham/.config/gova-agent/auth`.

The service uses HTTP/JSON because it has very low startup/runtime overhead, works over LAN/Tailscale/private tunnels, and does not require GitHub jobs. Commands run in independent process groups; stdout/stderr are written directly to runtime files, so client disconnects do not terminate work.

## Agent lifecycle

1. Register an agent.
2. Create or resume a task.
3. Create a task worktree.
4. Acquire narrow path/module locks only when needed.
5. Execute commands directly through the gateway.
6. Checkpoint meaningful state.
7. Commit on the local agent branch.
8. Submit the commit to local integration.
9. The integration path cherry-picks, verifies, and pushes only `integration`.

Agents are peers. Handoff state is stored in SQLite, not model memory.

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

## Dependency reuse

Worktree creation does not run `npm ci`. When the canonical checkout already has `node_modules` and the worktree is based on the same `main` dependency graph, the worktree gets a fast symlink to that dependency tree. If a task changes dependency manifests/lockfiles, materialize its own dependencies before running package-manager mutations; do not mutate the shared symlink.

## systemd

```bash
sudo systemctl status gova-agent-gateway.service
sudo systemctl restart gova-agent-gateway.service
journalctl -u gova-agent-gateway.service -n 100 --no-pager
```

If passwordless system service installation is unavailable, the installer falls back to a user systemd service.

## Bootstrap

`tools/local-agent/install.sh` installs the committed runtime without dependency installation. The legacy GitHub request/workflow transport is not part of normal operation after migration.

## Failure recovery

- Agent/client disconnect: command continues and logs remain queryable.
- Gateway crash: systemd restarts it; SQLite/task state remains.
- Stale lock: lease recovery removes it.
- Integration conflict: integration worktree is left in conflict state and the task records the conflict instead of overwriting work.
- Uncommitted agent worktree: removal refuses unless explicitly forced.
- Handoff: task ownership and notes are persisted and another agent can continue from the same worktree/branch.
