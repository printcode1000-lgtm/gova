# Persistent Local Agent Runtime

## Purpose

Before the first task action, every local agent asks the user to select an execution mode unless the task already selects one. Mode A is Gateway-managed isolation; Mode B edits the canonical checkout at `/home/hesham/gova` directly. GitHub `workflow_dispatch` through `local-agent-bootstrap.yml` is the primary remote bootstrap/entry path and does not select a mode.

## Remote branch model

GitHub contains exactly two recognized remote branches: `main` and `integration`. `main` is the production/release branch. Mode A explicitly authorizes a local `agent/*` branch and submitting verified work to `integration`; it never creates another remote branch or authorizes deployment. Mode B keeps the canonical checkout on its current branch and does not create an `agent/*` branch, move work to `integration`, commit, push, or deploy.

## Local layout

- Default working checkout: `/home/hesham/gova`
- Optional managed worktree root: `/home/hesham/gova-agents/` (created/used only when explicitly requested)
- Optional Gateway runtime state: `/home/hesham/.local/share/gova-agent-runtime`
- Optional Gateway database: `runtime.sqlite3` using SQLite WAL
- Optional local client: `/home/hesham/.local/bin/gova-agent`
- Read-only local monitor: `/home/hesham/.local/bin/gova-agent-monitor`

## Mode B: direct local editing

1. Work in `/home/hesham/gova` on its current local branch and working tree.
2. Preserve every pre-existing local modification; never reset or relocate it merely to obtain isolation.
3. Read the required project context and modify the requested files directly.
4. Run the smallest relevant non-browser verification locally.
5. Stop with the verified changes still local unless the user explicitly asks for commit, push, integration, or deployment.

Mode B does **not** register an agent with localhost control, create a task/worktree, create an `agent/*` branch, acquire Gateway locks, or submit anything to `integration`.

## Mode A: Gateway-managed isolation

`gova-agent-gateway.service` may remain installed and running under systemd. Use Gateway registration, task state, locks, worktrees, handoffs, and `integration-submit` when the user selects Mode A.

In Mode A, the Gateway listens on TCP port `8765`; `/health` is public and mutation/state APIs require the local key stored outside Git in `/home/hesham/.config/gova-agent/auth`. Create the Mode-A task, run `gova-agent mode-a-bootstrap <agent> <task>` once, then wait for the manual GitHub dispatch to run the self-hosted bootstrap and restart the persistent service. Gateway rejects a worktree, command, lock, or integration submission until that dispatch is recorded. The selected flow then creates its worktree under `/home/hesham/gova-agents/`, uses a local `agent/*` branch, and submits verified work through `integration-submit`.

## Unified local execution monitor

`gova-agent-monitor` is a read-only observability surface for the complete local execution stack. It does not register agents, refresh heartbeats, acquire locks, mutate Git, restart services, or dispatch GitHub jobs.

The monitor combines these read-only sources:

- runtime SQLite for agents, tasks, commands, locks, messages, handoffs, and events;
- the local gateway `/health` endpoint plus read-only `systemctl is-active`;
- GitHub Actions API state for self-hosted runners, active/queued workflow runs, and active/queued jobs;
- local `Runner.Listener` / `Runner.Worker` process discovery so runner activity remains visible even when the GitHub runner API is unavailable;
- canonical checkout and `git worktree list` state for all local worktrees;
- recent runtime commands and the latest discoverable GitHub Runner diagnostic log.

The desktop launcher opens the monitor as a multi-window workspace:

1. **Dashboard** — combined health and currently active agents/jobs.
2. **Agents** — local/cloud agents, tasks, branches, command activity, locks, and per-agent detail windows.
3. **GitHub Runner / Actions** — self-hosted runner status, runner processes, active/queued workflow jobs, branch, SHA, and assigned runner.
4. **Gateway / Runtime** — gateway health, service scope/status, SQLite counts, locks, and recent events.
5. **Git / Worktrees** — canonical checkout, `origin/main`, `origin/integration`, every local worktree, branch, HEAD, and modified-file count.
6. **Logs** — recent agent commands plus the latest available GitHub Runner diagnostic log.

Opening an agent from the Agents window creates a separate live terminal window for that agent. Each window refreshes independently. Local runtime information refreshes continuously, Git/worktree inspection is cached briefly, and GitHub network state is cached for several seconds to avoid unnecessary API traffic.

Run the complete desktop-style workspace with:

```bash
gova-agent-monitor --workspace
```

Run an individual window with:

```bash
gova-agent-monitor --view dashboard
gova-agent-monitor --view agents
gova-agent-monitor --view github
gova-agent-monitor --view runtime
gova-agent-monitor --view worktrees
gova-agent-monitor --view logs
```

Run a one-shot combined status with:

```bash
gova-agent-monitor --once
```

Machine-readable output is available with `--json`. The monitor may resolve the existing local GitHub credential only to make authenticated read-only API requests when runner metadata requires authentication; credentials are never printed or persisted by the monitor.

Self-test agents use tagged IDs such as `sim-alpha-<tag>`. A successful self-test removes the runtime rows created by that tag after its worktrees and locks have been cleaned, so repeated validation does not fill the monitor with stale simulation agents.


## Arabic HTML desktop monitor

The Ubuntu desktop icon opens an Arabic HTML dashboard backed by a loopback-only service at `http://127.0.0.1:8766/` in browser app mode. The HTML server is read-only and reuses the existing monitor snapshot functions; it does not register agents, dispatch commands, acquire locks, modify Git, restart the gateway, or expose a remote listening address.

The Arabic dashboard keeps the last successful snapshot visible while background refresh is running, so data does not disappear or flicker between reads. It provides twelve numbered tabs: Overview, Agents, GitHub Runners, GitHub Jobs, Gateway, Runtime, Git/Worktrees, Locks, Commands, Events, Logs, and System. Every tab contains a short Arabic explanation. Agent rows open an in-page details drawer instead of another terminal window.

The service is `gova-agent-monitor-web.service`, listens only on `127.0.0.1:8766`, and is installed as a user systemd service. The desktop launcher is `/home/hesham/.local/bin/gova-agent-monitor-web`. The curses monitor remains available from `gova-agent-monitor` as a CLI fallback.

### Responsive black/white UI and public viewing

The HTML monitor is responsive across desktop, laptop, tablet, and phone widths. The visual contract is intentionally monochrome: black backgrounds and white text only; secondary text uses white with reduced opacity rather than another text color. Tables remain horizontally scrollable on narrow displays, and the navigation becomes a compact horizontal tab strip.

Public viewing is provided by a Cloudflare Quick Tunnel while the HTTP server itself remains bound to loopback. `gova-agent-monitor-public enable` starts the persistent user service and writes the current HTTPS `trycloudflare.com` URL to `/home/hesham/.local/state/gova-agent-monitor/public-url`; the dashboard displays that URL at the top and offers a copy control. Anyone who has the public URL can view the read-only monitor while the tunnel is enabled, so the URL should be treated as public observability access. A Quick Tunnel URL may change after the tunnel service restarts; the dashboard automatically displays the current URL. `gova-agent-monitor-public disable` stops the public tunnel.

## Optional Gateway CLI examples

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

## Optional managed-mode locks and recovery

The following behavior applies only when Gateway-managed mode was explicitly requested. Locks are scoped by kind and name/path and carry leases. Expired locks are recovered automatically at gateway startup or through `gova-agent lock-recover`. The system intentionally does not serialize unrelated agents.

Task/worktree/command/message/handoff state survives gateway restarts. Commands are launched independently of the client request. After gateway restart, command state is reconciled from PID and exit-marker files. After machine reboot, durable task state remains and dead commands are marked interrupted when inspected.

When the user explicitly requests `integration-submit`, the integration lock serializes only that final integration transaction. If a cherry-pick conflicts, the gateway aborts the cherry-pick, resets the integration worktree to `origin/integration`, records the conflict on the task, and releases the lock. A failed submission therefore does not leave the shared integration worktree dirty.

## Optional managed-worktree dependency reuse

When an isolated worktree was explicitly requested, worktree creation does not run `npm ci`. When the canonical checkout already has `node_modules`, a new worktree may get a fast symlink to that dependency tree. If a task changes dependency manifests/lockfiles, materialize its own dependencies before running package-manager mutations; do not mutate the shared symlink.

## Real Codex validation

`tools/local-agent/codex_test.py` is an explicit Gateway test harness, not the normal local-agent workflow. When deliberately run, it validates an authenticated Codex worker in isolated managed mode, including worktree, checkpoint/handoff, commit-scope, and optional `integration` behavior.

On this Ubuntu host, Codex's normal Linux `workspace-write` sandbox cannot execute because Bubblewrap cannot create the required user namespace (`RTM_NEWADDR: Operation not permitted`). The validation harness therefore runs Codex with its internal sandbox disabled for that process, while removing GitHub token environment variables and overriding Git's credential helper and push URL. The model is restricted by task scope to its isolated worktree, and the trusted harness rejects any change outside the exact allowed path before committing or integrating it. This fallback is for the local Codex worker test; it does not grant normal gateway clients a new GitHub publication path.

## systemd

```bash
sudo systemctl status gova-agent-gateway.service
sudo systemctl restart gova-agent-gateway.service
journalctl -u gova-agent-gateway.service -n 100 --no-pager
```

If passwordless system service installation is unavailable, the installer falls back to a user systemd service.

## Bootstrap

`tools/local-agent/install.sh` installs or refreshes optional local-agent infrastructure without dependency installation. The committed bootstrap workflow is manual-only (`workflow_dispatch`), is the primary remote bootstrap/entry path, and installs from the canonical checkout `/home/hesham/gova` without creating or resetting an integration worktree. Bootstrap does not opt normal local agents into Gateway-managed execution.

The installer also installs a desktop entry named **Gova Local Agents Monitor**. The icon opens the local Arabic HTML dashboard through `gova-agent-monitor-web`; the terminal monitor remains available as a CLI fallback.

## Disaster-recovery bundle

Use the self-contained recovery command when the machine, canonical checkout, runtime database, or agent worktrees must be reconstructed:

```bash
gova-agent recovery create /path/to/gova-agent-recovery.tar.gz
gova-agent recovery verify /path/to/gova-agent-recovery.tar.gz
gova-agent recovery restore /path/to/gova-agent-recovery.tar.gz /empty/restore-root
```

The archive preserves the complete committed Local Agent source, all local refs and local-only agent commits, a consistent SQLite backup, and recoverable staged/unstaged/safe-untracked worktree state. Credentials are intentionally excluded and regenerated or reconnected after recovery. The exact archive contract, exclusions, verification procedure, and isolated restore sequence are defined in `docs/06-super-admin-and-operations/local-agent-recovery.md`.

## Optional managed-mode failure recovery

These cases apply only to explicitly selected Gateway-managed execution.

- Agent/client disconnect: command continues and logs remain queryable.
- Gateway crash: systemd restarts it; SQLite/task state remains.
- Stale lock: lease recovery removes it.
- Integration conflict: cherry-pick is aborted and the integration worktree is reset cleanly to `origin/integration`; the task records the conflict.
- Uncommitted agent worktree: removal refuses unless explicitly forced; disaster-recovery archives preserve its staged, unstaged, and safe untracked state.
- Handoff: task ownership and notes are persisted and another agent can continue from the same worktree/branch.

### Desktop multi-window launcher

The desktop launcher opens one read-only terminal window containing Dashboard, Agents, GitHub runners/jobs, Gateway/Runtime, Git/Worktrees, and Logs as in-window views. Use D/A/H/G/W/L to switch views without opening another window. Agent details also open inside the same window. GUI startup diagnostics are written to `/home/hesham/.local/state/gova-agent-monitor/launcher.log`.

### Stable single-window navigation

The monitor uses numeric screen navigation: `1` Dashboard, `2` Agents, `3` GitHub, `4` Runtime, `5` Worktrees, and `6` Logs. Agent details use arrow keys plus Enter. Loading frames are shown only when the monitor starts or changes screens; periodic refreshes keep the current data visible until the refreshed snapshot is ready, preventing blank/flickering screens.
