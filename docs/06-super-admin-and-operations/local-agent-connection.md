# GOVA Local Agent Connection Guide

This file defines the **approved connection path for local-agent access in the GOVA project**. Any cloud agent or GitHub-driven agent must follow this model when it needs to reach the local machine and perform work against the real repository.

---

## 1. Connection Architecture

The correct path is:

```text
Cloud Agent
    ↓
GitHub Actions
    ↓
Self-hosted Runner on the local machine
    ↓
gova-agent-gateway
    ↓
/home/hesham/gova
```

Precise meaning:

- The cloud agent does not connect directly to `127.0.0.1:8765`.
- GitHub Actions dispatches the Job to the Self-hosted Runner running on the local machine.
- Once the Job is running on that machine, it can call the Gateway locally.
- The Gateway is the local execution layer responsible for commands, tasks, worktrees, and execution state.

---

## 2. Local Gateway

The service is:

```text
gova-agent-gateway.service
```

The main implementation is:

```text
tools/local-agent/gateway.py
```

Important default configuration:

```text
Repository:
  /home/hesham/gova

Worktrees:
  /home/hesham/gova-agents

Runtime:
  /home/hesham/.local/share/gova-agent-runtime

Port:
  8765
```

From the same machine, the service can be reached through:

```text
http://127.0.0.1:8765
```

However, the current service configuration actually binds the Gateway to:

```text
0.0.0.0:8765
```

Therefore, `127.0.0.1:8765` is the **local access address from inside the machine**, but it does not mean the service is bound exclusively to localhost.

---

## 3. Gateway Responsibilities

The Gateway is the local execution and coordination layer. It is responsible for at least:

- Starting commands.
- Tracking command state.
- Capturing `stdout`.
- Capturing `stderr`.
- Managing tasks.
- Managing agents and sessions.
- Managing worktrees.
- Managing locks and leases.
- Recovering stale locks.
- Managing messages and handoffs.
- Recording events.
- Performing Git/GitHub operations required by local execution.

By default, the Gateway operates against the real repository:

```text
/home/hesham/gova
```

---

## 4. Role of GitHub Actions

**GitHub Actions is not the normal command transport once the local Gateway is
available.** It is a bootstrap, recovery, or fallback mechanism for reaching the
local machine and restoring or directing Gateway-based execution. Normal agent
commands, coordination, locks, checkpoints, handoffs, and result streaming go to
`gova-agent-gateway` directly, as
[Persistent Local Agent Runtime](./local-agent-runtime.md) and the repository's
working rules require.

Within that fallback role, GitHub Actions is the **entry point into the local
machine** because it can dispatch Jobs to the Self-hosted Runner. Everything
below describes that path: it is how an agent with no working Gateway route
reaches the machine, not the everyday one.

Do not model the connection as:

```text
Cloud Agent → 127.0.0.1:8765
```

That is not network-correct.

The correct model is:

```text
Cloud Agent
    ↓
GitHub
    ↓
GitHub Actions Job
    ↓
Self-hosted Runner
    ↓
127.0.0.1:8765
    ↓
gova-agent-gateway
```

The truly direct local segment is therefore:

```text
Self-hosted Runner → gova-agent-gateway
```

---

## 5. State of the main Branch

The `main` branch must not be used as a temporary transport channel for generic agent command workflows.

The core workflows currently on `main` are for project-level responsibilities such as:

```text
deploy-main.yml
docs.yml
local-agent-bootstrap.yml
```

There is no permanent generic workflow on `main` whose purpose is to accept arbitrary agent commands and forward them to the Gateway.

---

## 6. Using integration as a Temporary Transport Channel

When a cloud agent needs to perform an operation on the local machine and no ready execution path already exists, the branch:

```text
integration
```

may be used as a temporary transport channel.

The flow is:

```text
Cloud Agent
    ↓
Add or update a temporary workflow on integration
    ↓
Push to integration
    ↓
GitHub Actions
    ↓
Self-hosted Runner
    ↓
Call gova-agent-gateway locally
    ↓
Execute the task against /home/hesham/gova
```

---

## 7. Rules for Temporary Workflows

Any temporary workflow created for this purpose must:

1. Run on the Self-hosted Runner.
2. Not treat an isolated GitHub Actions checkout as the real project workspace.
3. Use the Runner primarily as the entry point into the local machine.
4. Call the local Gateway.
5. Treat the final target repository as:

```text
/home/hesham/gova
```

6. Use the Gateway API or Gateway execution interfaces whenever possible.
7. Record execution results clearly.
8. Never become a permanent workflow on `main` unless there is an explicit architectural decision to do so.

---

## 8. Cleaning integration After the Task

After the task is complete and verified:

1. Remove any temporary workflow created only for agent transport.
2. Remove temporary task-specific files.
3. Reset `integration` to match `main` exactly if no other work is in progress on it.

The goal is for `integration` to remain a temporary working lane, not a permanent source of behavior that differs from `main`.

---

## 9. Core Rule for Any Agent

When actual work must be performed on the local machine, agents must reason about the layers as follows:

```text
GitHub = transport channel to the Runner

Self-hosted Runner = execution point physically running on the local machine

gova-agent-gateway = local control and execution gateway

/home/hesham/gova = real target repository
```

Do not confuse:

```text
GitHub checkout inside the Job
```

with:

```text
/home/hesham/gova
```

The real local repository is the final target whenever the request is to inspect, repair, modify, or verify the actual local environment.

---

## 10. Short Reference Flow

```text
Cloud Agent
  → GitHub
  → GitHub Actions
  → Self-hosted Runner
  → http://127.0.0.1:8765
  → gova-agent-gateway
  → /home/hesham/gova
```

When a temporary transport path is required:

```text
Cloud Agent
  → temporary workflow on integration
  → GitHub Actions
  → Self-hosted Runner
  → gova-agent-gateway
  → /home/hesham/gova
  → verify
  → remove temporary workflow
  → reset integration to main
```

---

## 11. Important Principle

Do not assume that the existence of the Gateway means the cloud agent can directly reach it over the network.

The Gateway is local to the machine.

The component that actually reaches it is the Self-hosted Runner after the Job has been dispatched by GitHub Actions.

This separation is the key architectural rule of the connection model.
