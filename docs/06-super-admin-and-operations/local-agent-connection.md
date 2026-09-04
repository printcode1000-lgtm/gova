# GOVA Local Agent Connection Guide

This document defines the current approved remote-entry and local-execution model.

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

## 4. Branch model

The only recognized remote branches are `main` and `integration`.

- `main`: production/release branch and normal canonical local checkout.
- `integration`: used only when the user explicitly requests aggregation/integration work.

A normal local task does not pass through `integration` and does not create a task branch.

## 5. Bootstrap contract

`.github/workflows/local-agent-bootstrap.yml` is manual-only (`workflow_dispatch`), runs on the Gova self-hosted Runner, reuses the host checkout/toolchain, and installs infrastructure from `/home/hesham/gova`. It must not create or reset `/home/hesham/gova-agents/integration`.

Bootstrap is an entry/recovery operation, not permission to route subsequent local work through the Gateway.

## 6. Short reference

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
