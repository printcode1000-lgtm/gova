# Persistent Local Agent Runtime

## Final Migration State (2026-09-02)

- GitHub has exactly two remote branches: `main` and `integration`. Agent task branches are local-only Git worktrees.
- Normal agent commands use the persistent `gova-agent-gateway` service and do not dispatch GitHub Actions jobs.
- Runtime state is SQLite WAL under `/home/hesham/.local/share/gova-agent-runtime/`.
- Agent worktrees live under `/home/hesham/gova-agents/`; the shared integration worktree is `/home/hesham/gova-agents/integration`.
- New task worktrees start from the latest `origin/integration`, so every new agent sees all previously integrated work.
- The only Local Runner GitHub workflow is `local-agent-bootstrap.yml`, which is manual bootstrap/reinstall only.
- The retired request branch, dispatch workflows, `.agent-control`, `@asol/local-agent-core`, and `scripts/local-agent-*.ts` control plane have been removed.
- Normal completion integrates local commits through the gateway into `integration`; promotion from `integration` to `main` is separate and deliberate.
- Reinstalling the gateway always restarts the systemd service so the running process loads the newly installed runtime code.
- A failed integration cherry-pick is aborted and the shared integration worktree is reset to `origin/integration` before the integration lock is released.
- A failed post-cherry-pick verification also resets the shared integration worktree and records a resumable task checkpoint.
- `tools/local-agent/selftest.py` is the reusable adversarial multi-agent runtime test.

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
