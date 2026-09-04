# Agent Execution Mode Enforcement

## Summary

Make execution-mode selection a machine-enforced Gateway contract. Gateway tasks must declare `A` or `B`; Mode A may create a managed worktree and submit verified work to `integration`, while Mode B is refused by every Gateway mutation because it is direct-editing mode. A dedicated, manual GitHub Actions dispatch starts the existing bootstrap workflow exactly once for a Mode A request; the self-hosted runner installs and enables the persistent Gateway service.

## User Review Required

> [!IMPORTANT]
> Dispatching Mode A calls GitHub Actions and therefore changes external state. The implementation will provide a separate explicit dispatch command and a dry-run test. A real dispatch must happen only after the change is committed and pushed, so the self-hosted runner installs the matching revision.

## Proposed Changes

- [MODIFY] `tools/local-agent/gateway.py`
  - Add an immutable `execution_mode` field to Gateway task records.
  - Require an `A` or `B` mode at task creation.
  - Reject worktree creation, Gateway command execution, locks, and integration submission for Mode B.
  - Add a narrowly scoped Mode A bootstrap endpoint that dispatches only `local-agent-bootstrap.yml` on `main`, records the dispatch, and never accepts arbitrary workflow names, branches, or commands.

- [MODIFY] `tools/local-agent/cli.py`
  - Require `--mode A|B` for `task-create`.
  - Add a Mode A bootstrap command that invokes the constrained endpoint and supports a non-mutating dry-run.

- [MODIFY] `.github/workflows/local-agent-bootstrap.yml`
  - Add one constrained `workflow_dispatch` input identifying the Mode A bootstrap request.
  - Keep the single self-hosted job, canonical checkout, and no-secret/no-checkout/no-install-dependencies rules.
  - Continue invoking `tools/local-agent/install.sh`, which enables and restarts `gova-agent-gateway.service` with `Restart=always`.

- [MODIFY] `scripts/github-ci-policy.ts` and its focused tests
  - Enforce the Mode A-only workflow input and retain the existing bootstrap restrictions.

- [MODIFY] `tools/local-agent/selftest.py` and/or a focused Gateway test
  - Prove missing/invalid modes are rejected, Mode B mutations are rejected, and Mode A accepts only the approved workflow/ref in dry-run mode.

- [MODIFY] `AGENTS.md`, mirrored instruction surfaces, ADR-0006, and local-agent operational documentation
  - Specify that every agent records its selected mode when using the Gateway; Mode A performs one explicit GitHub bootstrap dispatch before managed work; Mode B stays direct and cannot use Gateway mutations.

## Verification Plan

- Focused Gateway/CLI self-tests covering rejected and allowed modes, no arbitrary dispatch target, and dry-run dispatch.
- `npm run github:ci-policy`, `npm run typecheck`, `npm run lint`, `npm run architecture:check`, `npm run runtime:check`, and `DOCS_CONTRACT_CHANGE=1 npm run docs:ci`.
- Regenerate documentation using `DOCS_CONTRACT_CHANGE=1 npm run docs:generate`.
- Runtime assessment: Development and the persistent local-agent runtime change; Web, static `out/`, Android, and iOS application payloads are unaffected and remain checked by `runtime:check`.
- After a pushed revision, dispatch the one Mode A bootstrap workflow and verify textually that it ran on the self-hosted runner, installed the same revision, and left the persistent Gateway healthy after the workflow exits.
