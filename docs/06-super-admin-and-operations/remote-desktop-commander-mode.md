# Remote Desktop Commander Execution Mode C

## Purpose

Mode C makes Remote Desktop Commander the exclusive execution transport for a Gova task. It exists for cloud agents that must operate directly on the authorized physical Gova device without routing execution through the Gateway, GitHub Actions, the cloud Mode-B projector, a public tunnel, or a separate cloud checkout.

## Selection contract

Before the first task action, an agent asks for A, B, or C unless the task already selects one. Selecting C means **every operation that reads, changes, executes, verifies, builds, inspects, or controls the project/device is performed through Remote Desktop Commander**.

This includes:

- repository and documentation reads;
- source/config/file search and edits;
- terminal and interactive process execution;
- test, lint, typecheck, architecture, docs, and runtime checks;
- Git status/diff/log/fetch/commit/push operations when separately authorized;
- package-manager, build, native, deployment, Vercel, GitHub CLI/API, and other external-service commands when separately authorized;
- local process/service inspection, start/stop/restart, logs, and filesystem operations.

If an operation needed by the task cannot be performed through Remote Desktop Commander, Mode C stops and reports the missing capability. It must never silently fall back to Mode A, Mode B, direct cloud execution, a GitHub connector, Gateway `exec`, a self-hosted workflow, or another transport.

## Canonical workspace

Mode C works directly in `/home/hesham/gova`, on its current branch and working tree. It preserves every pre-existing tracked, staged, and untracked change. It must not reset, clean, replace, relocate, or overwrite unrelated work merely to obtain a clean environment.

Mode C does not create `/home/hesham/gova-agents/<agent>/<task>` or an `agent/*` branch unless the user explicitly requests a separate operation that requires it. The default is the canonical checkout only.

## Required preflight

The first device action is executed through Remote Desktop Commander:

```bash
python3 /home/hesham/gova/tools/local-agent/mode_c_preflight.py
```

The preflight is non-mutating. It fails closed unless all of these are true:

1. `/home/hesham/gova` is the canonical Git repository.
2. The repository identity is `printcode1000-lgtm/gova`.
3. `.mcp.json` declares the official Remote Desktop Commander HTTP MCP endpoint.
4. Node.js is supported by the device-side Remote Desktop Commander runtime.
5. The Remote Desktop Commander device agent is running on the paired device.

A failed preflight means Mode C is unavailable for that task.

## Gateway boundary

The Gateway may store a Mode-C task row for observability, using `execution_mode=C` and `execution_transport=remote-desktop-commander`. It is **not** an execution transport for C.

Gateway worktree creation, command execution, managed bootstrap, locks used to control execution, integration submission, and canonical projection are forbidden for Mode C. The runtime guards reject C if those managed execution paths are attempted.

## GitHub boundary

Mode C adds no GitHub Actions workflow and uses neither `local-agent-bootstrap.yml` nor `local-agent-project.yml` as an execution channel. If a Mode-C task needs GitHub operations, the agent performs the authorized operation from the paired device through Remote Desktop Commander, for example by using the existing device-side `git` or `gh` tooling.

The repository still has exactly two recognized remote branches: `main` and `integration`.

## Authorization boundary

Selecting C chooses a transport; it does not grant unrelated authority. Commit, push, integration, deployment, destructive reset/clean, secret mutation, account mutation, or other privileged/destructive actions still require the same explicit user intent required outside Mode C.

## MCP configuration

The repository declares the official Remote Desktop Commander remote MCP server in `.mcp.json`:

```json
{
  "type": "http",
  "url": "https://mcp.desktopcommander.app/mcp"
}
```

Authentication and device pairing are owned by Remote Desktop Commander. Credentials are not committed to Gova.

## Verification

The repository keeps a focused contract test for Mode C:

```bash
npm run test:local-agent-mode-c
```

It validates the Gateway mode guard, CLI selection, MCP declaration, instruction-surface contract, preflight source, and Mode-C documentation. The live readiness check remains `mode_c_preflight.py` because only a real Remote Desktop Commander invocation can prove the paired device path is currently usable.

## Failure behavior

Mode C fails closed when Remote Desktop Commander is disconnected, the paired device is unavailable, the canonical repository cannot be confirmed, or a required operation is not exposed through the Remote Desktop Commander connection. The correct response is to report the blocker, not to change execution mode implicitly.
