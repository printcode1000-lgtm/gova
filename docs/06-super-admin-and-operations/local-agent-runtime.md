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

## Cloud Mode B: Git as transport, the runner as projector

A cloud agent has no route to the Gateway: the service listens on the device, its key never leaves `/home/hesham/.config/gova-agent/auth`, and the public monitor tunnel is observability, not a work channel. So the cloud path delivers work through Git and asks the device to apply it.

1. The agent edits in its own cloud checkout, based on `origin/integration`, and **verifies there before pushing** — `npm run architecture:check`, `npm run docs:ci`, and the `*-core` suites related to the change. A change that touches an API route, a package boundary, or anything else the Knowledge Graph derives from must also run `npm run docs:generate` and commit the regenerated files; the device gate reads those as stale and refuses the task otherwise. Verification on the device is a second opinion, not the agent's first one. `integration` is the base every cloud task branches from, so it must carry the current tooling; when it falls behind `main`, publish a commit onto `integration` whose tree is `main`'s tree — a merge commit with both branches as parents keeps either history and stays a fast-forward:

   ```bash
   git fetch origin main integration
   git push origin "$(git commit-tree origin/main^{tree} -p origin/integration -p origin/main -m 'chore(integration): align tree with main')":refs/heads/integration
   ```
2. It pushes its verified work to `integration`. No other remote ref is involved; `agent/*` branch creation is blocked by the repository ruleset. One commit is preferred, but the projection measures its delta from `git merge-base origin/main <sha>`, so a task that took several commits lands whole rather than losing its earlier hunks.
3. It dispatches `local-agent-project.yml` with `agent_id`, `task_id`, `goal`, and the full 40-character `integration_sha`. Step 2 needs only repository write access, which a connected agent already has; this step needs `actions: write`. An agent whose connection lacks it reports the SHA instead, and an operator runs the device-side command below — the gate and its guarantees are identical either way.
4. The self-hosted runner executes `tools/local-agent/project.sh` on the device. The script refuses a SHA that is not an ancestor of `origin/integration`, prepares a detached verification worktree at that commit (reusing the canonical `node_modules` by symlink), and runs `npm run architecture:check`, `npm run docs:ci`, and the `*-core` suites related to the change. The suites run in that worktree, but `scripts/local-agent/related-core-tests.ts` resolves them from the canonical checkout: a commit must not decide which suites are run against it, and a commit branched from an older `integration` would not carry the resolver at all.
5. On success the script registers the agent, creates the cloud-bridge Mode B task if it does not exist, and calls `gova-agent project`, which posts to `/v1/canonical/project`.
6. The Gateway projects that work onto `/home/hesham/gova` as an unstaged patch covering everything between the fork point and the named commit.

Failure is closed at every step: verification failure stops before projection, an unpublished SHA is rejected, a non cloud-bridge task is rejected, and a projection whose paths overlap canonical uncommitted work — or whose patch does not apply — is refused and recorded as `canonical-projection-blocked`.

Every refusal states its reason where it can be read back. The task is registered with the Gateway before verification starts, so a failed check lands on the task as `verification-failed` carrying the failing command, the integration SHA, and the tail of its output; a refused projection lands as `canonical-projection-blocked` carrying the overlapping paths or the patch error. Both are readable without the workflow log:

```bash
gova-agent task-status <task-id>
```

The full verification transcript stays at `/home/hesham/.local/state/gova-agent-projection/<task-id>.log`.

## Automatic pickup of marked commits

`gova-agent-project-watch.timer` is a user systemd timer, installed and enabled by `install.sh`, that runs one tick every 10 seconds. A tick reads the `integration` head with a single `git ls-remote` and does nothing further unless that head is new, so the idle cost is one ref query.

It is a **trigger, not a second gate**: it runs the same `tools/local-agent/project.sh`, so the verification, the fail-closed guards, and the recorded refusal reason are identical to the dispatch path.

Two rules keep it from surprising anyone:

- **Opt-in by marker.** Only a head commit whose subject starts with `hok_` is picked up. Anything else is logged as skipped and left alone, so `integration` stays usable for work that is not meant to land here automatically.
- **One attempt per head.** The SHA is recorded as handled *before* the projection runs. A failed verification therefore never re-runs on the next tick; it waits for a new commit, which is what the agent has to produce anyway. A head already projected through a dispatch is skipped too — the watcher reads the Gateway's task state before acting, so the two triggers never collide.

Task identity comes from the commit itself: `Gova-Agent:` and `Gova-Task:` trailers when present, otherwise `cloud-auto` and `integration-<sha8>`. The goal is the subject with the marker stripped.

```bash
systemctl --user status gova-agent-project-watch.timer
systemctl --user disable --now gova-agent-project-watch.timer   # stop automatic pickup
tail -f ~/.local/state/gova-agent-projection/watch.log
```

Per-pickup output is kept at `~/.local/state/gova-agent-projection/<task-id>.watch.log`, and handled heads at `handled-integration-shas` in the same directory.

Automatic pickup means a marked push changes the canonical working tree without anyone asking at that moment. The projection still refuses to touch a path you have uncommitted work in, but a file you are not holding will change under you. Disable the timer for any window where that is unwelcome.

`mode-a-bootstrap` is not part of this path. That guard exists to prove the managed runtime is installed and running; a request arriving from the local runner is the same proof.

```bash
git push origin HEAD:integration
gh workflow run local-agent-project.yml -f agent_id=cloud-001 -f task_id=notifications-copy -f goal="Fix notification copy" -f integration_sha=<40-char-sha>
```

The device-side equivalent, when reproducing the same gate by hand:

```bash
AGENT_ID=cloud-001 TASK_ID=notifications-copy TASK_GOAL="Fix notification copy" INTEGRATION_SHA=<40-char-sha> bash tools/local-agent/project.sh
```

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
gova-agent project cloud-001 notifications-copy <40-char-integration-sha>
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
