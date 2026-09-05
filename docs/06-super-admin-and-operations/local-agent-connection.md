# GOVA Local Agent Connection Guide

This document defines the current approved remote-entry and local-execution model, including execution Mode C through Remote Desktop Commander.

## 1. Primary remote entry path

The primary path for preparing or recovering the local device is:

```text
Cloud agent / operator
  -> GitHub workflow_dispatch
  -> local-agent-bootstrap.yml
  -> self-hosted GitHub Runner
  -> /home/hesham/gova
```

GitHub reaches the physical device through the self-hosted Runner. The Runner must treat `/home/hesham/gova` as the real project checkout and must not replace it with an isolated Actions checkout.

## 2. Default local execution

After the local agent is running on the device, normal work is direct:

```text
Local agent
  -> /home/hesham/gova
  -> inspect / edit / verify requested files directly
```

Normal local work must not automatically:

- call `127.0.0.1:8765` or register with `gova-agent-gateway`;
- create `/home/hesham/gova-agents/<agent>/<task>`;
- create an `agent/*` branch;
- acquire Gateway locks/checkpoints/handoffs;
- submit results to `integration`;
- commit, push, or deploy.

Existing local modifications must be preserved.

## 3. Optional Gateway-managed mode

`gova-agent-gateway.service`, its localhost/public transport, runtime database, worktree APIs, and `integration-submit` remain available as explicit tools. They are used only when the user specifically requests Gateway-controlled execution, isolated worktrees, multi-agent coordination, or integration submission.

The fact that the Gateway service is installed or running does not authorize an agent to use it.

## 4. Remote Desktop Commander Mode C

When the user selects Mode C, the cloud agent does not bootstrap through GitHub and does not use the Gateway as its command channel. The authorized Remote Desktop Commander connection is the exclusive execution transport for the entire task:

```text
Cloud agent
  -> Remote Desktop Commander
  -> paired Gova device
  -> /home/hesham/gova
  -> read / edit / execute / verify / operate
```

All repository reads, edits, terminal commands, tests, Git operations, service/process actions, and authorized external-service commands must go through Remote Desktop Commander. The first device action runs `python3 /home/hesham/gova/tools/local-agent/mode_c_preflight.py` through that same connection. If the transport is unavailable or lacks a required capability, the task stops rather than falling back to another execution path.

See [Remote Desktop Commander Execution Mode C](./remote-desktop-commander-mode.md).

## 5. Branch model

The only recognized remote branches are `main` and `integration`.

- `main`: production/release branch and normal canonical local checkout.
- `integration`: used only when the user explicitly requests aggregation/integration work.

A normal local task does not pass through `integration` and does not create a task branch.

## 6. Bootstrap contract

`.github/workflows/local-agent-bootstrap.yml` is manual-only (`workflow_dispatch`), runs on the Gova self-hosted Runner, reuses the host checkout/toolchain, and installs infrastructure from `/home/hesham/gova`. It must not create or reset `/home/hesham/gova-agents/integration`.

Bootstrap is an entry/recovery operation, not permission to route subsequent local work through the Gateway.

## 7. Short reference

Default:

```text
GitHub workflow_dispatch -> Self-hosted Runner -> /home/hesham/gova
     -> direct local edits
```

Explicit managed mode only:

```text
User explicitly requests managed/isolation mode
  -> gova-agent-gateway
  -> optional worktree / locks / task state / integration-submit
```

Mode C:

```text
Cloud agent -> Remote Desktop Commander -> /home/hesham/gova
     -> all reads / edits / commands / verification / authorized operations
```
