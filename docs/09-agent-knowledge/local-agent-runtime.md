# Persistent Local Agent Runtime

## Current Local-Agent Operating Policy (2026-09-04)

This section supersedes the older gateway-first migration notes below for normal local-agent work.

- The default local workspace is the canonical checkout at `/home/hesham/gova`. Local agents edit requested files there directly.
- Do not create per-task worktrees or `agent/*` branches unless the user explicitly requests isolated worktree execution.
- Do not automatically register with, send commands through, or otherwise use `gova-agent-gateway`/localhost agent control. Gateway-managed execution is opt-in and requires an explicit user request.
- Do not automatically submit completed work to `integration`, commit, push, or deploy. Each of those actions requires explicit user intent.
- GitHub `workflow_dispatch` through `.github/workflows/local-agent-bootstrap.yml` is the primary remote bootstrap/entry path for preparing or recovering the local device. Bootstrap may install or restart gateway infrastructure, but that infrastructure is not the default execution path for local agents.
- Existing local modifications in `/home/hesham/gova` must be preserved. A local agent must not reset, replace, or relocate them merely to obtain isolation.

The sections dated 2026-09-02 and 2026-09-03 below are retained as historical migration and verification records. Where they describe gateway-first normal execution, this current policy takes precedence.

## Historical Migration State (2026-09-02, superseded by the 2026-09-04 policy)

- GitHub has exactly two remote branches: `main` and `integration`. Agent task branches are local-only Git worktrees.
- Historical state at that checkpoint: normal agent commands used the persistent `gova-agent-gateway` service. This is no longer the default after the 2026-09-04 policy above.
- Runtime state is SQLite WAL under `/home/hesham/.local/share/gova-agent-runtime/`.
- Agent worktrees live under `/home/hesham/gova-agents/`; the shared integration worktree is `/home/hesham/gova-agents/integration`.
- Historical state at that checkpoint: new task worktrees started from `origin/integration`. Current default local work does not create a task worktree.
- The only Local Runner GitHub workflow is `local-agent-bootstrap.yml`, which is manual bootstrap/reinstall only.
- The retired request branch, dispatch workflows, `.agent-control`, `@asol/local-agent-core`, and `scripts/local-agent-*.ts` control plane have been removed.
- Normal completion integrates local commits through the gateway into `integration`; promotion from `integration` to `main` is separate and deliberate.
- Reinstalling the gateway always restarts the systemd service so the running process loads the newly installed runtime code.
- A failed integration cherry-pick is aborted and the shared integration worktree is reset to `origin/integration` before the integration lock is released.
- A failed post-cherry-pick verification also resets the shared integration worktree and records a resumable task checkpoint.
- `tools/local-agent/selftest.py` is the reusable deterministic adversarial multi-agent runtime test.
- `tools/local-agent/codex_test.py` is the real authenticated Codex worker validation harness.

## Repository Synchronization Checkpoint (2026-09-03)

The canonical device checkout is `/home/hesham/gova` and it was verified on branch `main` with an empty porcelain status before synchronization. The shared integration checkout remains `/home/hesham/gova-agents/integration`.

At `2026-09-03T14:55:02Z`, the final synchronization verification reported:

```json
{
  "device_branch": "main",
  "device_main_sha": "172294c427e1a7d4554b8e9b0c6f344f77641948",
  "origin_main_sha": "172294c427e1a7d4554b8e9b0c6f344f77641948",
  "origin_integration_sha": "1b4ecc5157711267affe2747bcc11ecb6a6724f7",
  "shared_tree_sha": "3a5989aee7c7bf19ecbd8c64efb45b17f573c8a5",
  "working_tree_clean": true,
  "main_vs_integration_file_diff": "empty"
}
```

Interpretation of that checkpoint:

- The device checkout, `origin/main`, and `origin/integration` had the same Git tree SHA. This proves the tracked file names, file modes, and file contents were identical recursively at that checkpoint.
- `main` and `integration` intentionally had different commit SHAs and histories. Different commit SHAs do not imply different files when their tree SHA is identical.
- The synchronization preserved the existing `main` history by creating a new `main` commit whose tree was exactly the verified `origin/integration` tree; no force-push was required.
- A stale `/home/hesham/gova/.git/index.lock` was encountered during verification. It was removed only after confirming that neither `fuser` nor `lsof` reported an active holder. Active Git locks must never be removed automatically.
- All temporary synchronization workflows and trigger files were absent from the final synchronized tree.
- The final GitHub workflow set was exactly `deploy-main.yml`, `docs.yml`, and `local-agent-bootstrap.yml`.
- The temporary synchronization procedure was a one-shot recovery/verification operation. It does not replace the normal gateway-based integration flow described above.

For future equality checks, compare trees rather than commit identities:

```bash
git -C /home/hesham/gova fetch origin main integration
git -C /home/hesham/gova status --porcelain --untracked-files=all
git -C /home/hesham/gova rev-parse HEAD^{tree}
git -C /home/hesham/gova rev-parse origin/main^{tree}
git -C /home/hesham/gova rev-parse origin/integration^{tree}
git -C /home/hesham/gova diff --quiet origin/main origin/integration
```

A synchronization operation must stop instead of resetting a worktree when `git status --porcelain --untracked-files=all` is non-empty.

## Local Agents Monitor

`gova-agent-monitor` is the single supported local monitor. Installation replaces the legacy `@asol/local-agent-core` desktop launcher in place and terminates any stale `scripts/local-agent-watch.ts` process.

The monitor is intentionally read-only. It reads the persistent SQLite WAL database and command output files directly and therefore never registers itself, updates heartbeats, takes locks, or dispatches GitHub Actions jobs.

The main window lists every known agent and derives its visible type as local or cloud. Local agents are the default; agent IDs using the `cloud-` or `remote-` convention are shown as cloud agents when no explicit profile metadata exists. The window refreshes automatically and supports:

- `1` through `9`: open the corresponding agent immediately.
- Arrow keys or `j` / `k`: select an agent.
- `Enter`: open the selected agent.
- `q`: close the current window.

When a graphical desktop is available, selecting an agent opens a separate GNOME Terminal window. If no graphical terminal is available, the same detail view opens inside the current terminal.

Each agent detail view shows the agent/session identity, local/cloud classification, effective runtime status, last-seen age, current task and goal, worktree, local branch, current commit, modified files, current/recent command and PID, exit state, task checkpoint fields, tests and results, blockers, locks, messages, handoffs, recent events, and the tail of the latest command output.

The desktop entry remains `Gova Local Agent Monitor` under `~/.local/share/applications/gova-agent-monitor.desktop`, but now launches `/home/hesham/.local/bin/gova-agent-monitor` instead of the retired package monitor.

Useful commands:

```bash
gova-agent-monitor
gova-agent-monitor --once
gova-agent-monitor --agent <agent-id>
gova-agent-monitor --agent <agent-id> --json
```

## Real Codex Worker Validation

The authenticated Codex installation discovered on the Local Runner is:

```text
/home/hesham/.codex/plugins/.plugin-appserver/codex
```

The validation harness invokes `codex exec` through the persistent gateway inside a gateway-created local worktree. The Codex worker is constrained to its isolated workspace, is forbidden from pushing or changing remote refs, and its result is peer-reviewed before an optional `integration-submit`.

`codex_test.py` also registers a concurrent reviewer and a cloud-visibility probe, verifies that the monitor shows both the real Codex worker and a cloud-classified agent while Codex is executing, tests gateway messages and handoff, validates the Codex commit scope, and removes the temporary worktrees/runtime records at the end.

```bash
python3 tools/local-agent/codex_test.py --integrate-safe
```

## Final Migration Verification

```json
{
  "verified_at": "2026-09-02T08:49:11.210737+00:00",
  "main_sha_at_completion": "0526829af50eddecb2f4f9e5974cc3ba3e288c77",
  "integration_submit_sha": "1b0b567d991376afb9a14cf03744af3a0491254b",
  "tests": {
    "repository_checks_before_restart": "pass",
    "service_restart_current_runtime": "pass",
    "direct_command_no_github_job": "pass",
    "http_integration_submit": "pass",
    "integration_submit_no_github_job": "pass",
    "exact_two_remote_branches": "pass",
    "third_branch_blocked": "pass status=422",
    "ruleset_main_integration_only": "pass",
    "persistent_checkpoint_handoff": "pass"
  }
}
```

## Adversarial Multi-Agent Verification

GitHub Actions run `33612447189` was used only as an external one-shot entry point because the remote chat environment cannot directly open the local gateway transport. The simulation itself executed through the persistent gateway with independent runtime agent identities and local worktrees. The temporary push trigger and repair harness were removed after the test; `local-agent-bootstrap.yml` is manual-only again.

```json
{
  "verified_at": "2026-09-02T09:09:05Z",
  "simulation_tag": "c0016c7c",
  "hardening_commit": "e5beefdd9b7f85551bdb66b1a746f0e8496e2d4c",
  "conflict_probe_submit": "8bf426dea45742fd8784725a3f513cd3bb2c24d3",
  "conflict_probe_cleanup": "1d11e52c8312a262c4553a4a3520cd8aad11c90d",
  "main_sha_unchanged": "0526829af50eddecb2f4f9e5974cc3ba3e288c77",
  "tests": {
    "isolated_worktrees_from_integration": "pass",
    "parallel_exec_and_logs": "pass",
    "concurrent_messages_30": "pass",
    "lock_conflict_and_stale_recovery": "pass",
    "checkpoint_and_handoff": "pass",
    "restart_persistence": "pass",
    "command_cancel": "pass",
    "deterministic_integration_conflict": "pass",
    "conflict_recovery_clean": "pass",
    "new_agent_sees_latest_integration": "pass",
    "integration_submit_and_cleanup": "pass",
    "cleanup_no_lock_leaks": "pass",
    "exact_two_remote_branches": "pass",
    "main_unchanged_during_simulation": "pass"
  }
}
```
