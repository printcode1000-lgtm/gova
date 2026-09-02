# Persistent Local Agent Runtime


## Final Migration State (2026-09-02)

- GitHub has exactly two remote branches: `main` and `integration`. Agent task branches are local-only Git worktrees.
- Normal agent commands use the persistent `gova-agent-gateway` service and do not dispatch GitHub Actions jobs.
- Runtime state is SQLite WAL under `/home/hesham/.local/share/gova-agent-runtime/`.
- Agent worktrees live under `/home/hesham/gova-agents/`; the shared integration worktree is `/home/hesham/gova-agents/integration`.
- The only Local Runner GitHub workflow is `local-agent-bootstrap.yml`, which is manual bootstrap/reinstall only.
- The retired request branch, dispatch workflows, `.agent-control`, `@asol/local-agent-core`, and `scripts/local-agent-*.ts` control plane have been removed.
- Normal completion integrates local commits through the gateway into `integration`; promotion from `integration` to `main` is separate and deliberate.
- Reinstalling the gateway always restarts the systemd service so the running process loads the newly installed runtime code.
## Final Verification Evidence

```json
{
  "verified_at": "2026-09-02T08:49:11.210737+00:00",
  "main_sha_at_completion": "0526829af50eddecb2f4f9e5974cc3ba3e288c77",
  "integration_submit_sha": "1b0b567d991376afb9a14cf03744af3a0491254b",
  "service_pid": 866320,
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
