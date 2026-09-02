# Persistent Local Agent Runtime


## Final Migration State (2026-09-02)

- GitHub has exactly two remote branches: `main` and `integration`. Agent task branches are local-only Git worktrees.
- Normal agent commands use the persistent `gova-agent-gateway` service and do not dispatch GitHub Actions jobs.
- Runtime state is SQLite WAL under `/home/hesham/.local/share/gova-agent-runtime/`.
- Agent worktrees live under `/home/hesham/gova-agents/`; the shared integration worktree is `/home/hesham/gova-agents/integration`.
- The only Local Runner GitHub workflow is `local-agent-bootstrap.yml`, which is manual bootstrap/reinstall only.
- The retired request branch, dispatch workflows, `.agent-control`, `@asol/local-agent-core`, and `scripts/local-agent-*.ts` control plane have been removed.
- Normal completion integrates local commits through the gateway into `integration`; promotion from `integration` to `main` is separate and deliberate.
