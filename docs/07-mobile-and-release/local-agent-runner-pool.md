# Persistent Local Agent Runtime

## Purpose

`/home/hesham/gova` is the canonical repository clone and Git object source. Agents do not mutate it as a shared task workspace. The persistent `gova-agent-gateway` multiplexes all agent operations after a one-time/manual GitHub bootstrap.

## Topology

```text
GitHub Actions (manual bootstrap/recovery only)
  -> gova self-hosted runner
     -> tools/local-agent/install.sh
        -> gova-agent-gateway.service

Agents
  <-> persistent gateway API
      <-> SQLite WAL runtime state
      <-> isolated local Git worktrees
      <-> integration submit lock
```

Normal agent commands do not create GitHub jobs.

## Filesystem

- Canonical clone: `/home/hesham/gova`.
- Agent/task worktrees: `/home/hesham/gova-agents/<agent>/<task>/`.
- Shared integration worktree: `/home/hesham/gova-agents/integration`.
- Runtime state: `/home/hesham/.local/share/gova-agent-runtime/runtime.sqlite3`.
- Authentication material: `/home/hesham/.config/gova-agent/auth`.
- Installed gateway code: `/home/hesham/.local/lib/gova-agent/`.

Each task uses a local-only `agent/<agent>/<task>` branch. These branches are filesystem/Git isolation details and are never published.

## Persistent state and coordination

The runtime stores agents, sessions, tasks, commands, locks, messages, handoffs, and append-only events. Tasks persist goal, completed work, remaining work, decisions, modified files, commits, commands, tests/results, failures, blockers, dependencies, next action, and handoff notes so another equal-capability agent can resume at any time.

Locks are leased and stale locks are recoverable. Command stdout/stderr and exit state are persisted independently from the requesting connection.

## Integration

Remote GitHub state is limited to `main` and `integration`. Completed verified task commits are submitted through `/v1/integration/submit`, which serializes integration with a ref lock, verifies requested commands, and publishes `integration` through the authenticated GitHub API. Promotion to `main` is outside normal agent task completion.

## Bootstrap

`.github/workflows/local-agent-bootstrap.yml` is the only Local Runner workflow and is manual-only. It exists for first install/reinstall/recovery. It is not a command channel and must not be triggered by pushes after migration.

## Retired architecture

The GitHub-dispatch workflows, request branch, repository control-plane package/scripts, and old machine-local coordination/worktree directories are retired. There must be no second active control plane alongside the persistent gateway.
