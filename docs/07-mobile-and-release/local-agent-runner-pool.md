# Local Agent Runner Pool

## Purpose

`/home/hesham/gova` is the canonical repository clone **and the default local-agent working tree**. GitHub `workflow_dispatch` through the manual bootstrap workflow is the primary remote entry/recovery path. Self-hosted runners provide physical execution on the machine; they do not imply a separate task workspace.

## Default topology

```text
GitHub workflow_dispatch
  -> Gova self-hosted runner
     -> bootstrap infrastructure from /home/hesham/gova

Local agent
  -> /home/hesham/gova
     -> direct inspect / edit / verify
```

A normal local task creates no Gateway runtime rows, no `agent/*` branch, and no per-task worktree.

## Filesystem

- Canonical/default working clone: `/home/hesham/gova`.
- Optional managed worktree root: `/home/hesham/gova-agents/`.
- Optional Gateway runtime state: `/home/hesham/.local/share/gova-agent-runtime/runtime.sqlite3`.
- Gateway authentication material: `/home/hesham/.config/gova-agent/auth`.
- Installed optional Gateway code: `/home/hesham/.local/lib/gova-agent/`.

The optional directories and services may exist while unused. Their presence does not select managed mode.

## Optional managed coordination

When the user explicitly requests Gateway-managed isolation or multi-agent coordination, the existing runtime can store agents, sessions, tasks, commands, locks, messages, handoffs, and events. In that explicit mode, local-only worktrees/branches and `integration-submit` may be used according to the Gateway contract.

These capabilities are not part of normal local-agent completion.

## Integration

Remote GitHub state is limited to `main` and `integration`. `integration` is not an automatic completion lane. It is used only when the user explicitly requests integration/aggregation.

## Bootstrap

`.github/workflows/local-agent-bootstrap.yml` is the only Local Runner bootstrap workflow and is manual-only. It installs/reinstalls from `/home/hesham/gova`, preserves the canonical working tree, and must not create or reset a persistent integration worktree.

## Retired automatic behavior

The following are not default behavior: Gateway-first command routing, automatic per-task worktree creation, automatic `agent/*` branches, automatic `integration-submit`, and automatic Git/release actions. They may occur only when explicitly requested for the current task.
