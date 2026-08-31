# Local Runner Full Host Control

## Scope

The self-hosted Local Runner executes on the local server, not inside a repository sandbox. `/home/hesham/` is host filesystem state and `/home/hesham/gova` is the local clone/workspace used by the runner; neither absolute path is a repository path.

Authenticated Local Runner shell jobs are intentionally authorized to operate across the host filesystem. A shell command may change directory outside `/home/hesham/gova` and may invoke any executable available to the runner user, including `sudo`, `systemctl`, package managers, cron tools, networking tools, process-management tools, companion repositories, and local environment/secret files when the task requires them.

## Authority Model

1. GitHub is the authentication and dispatch boundary.
2. `agent-request/chatgpt` is the permanent ChatGPT request branch. It is never disposable and the gateway must never delete it.
3. The gateway may translate a validated request on that branch into a Local Runner `workflow_dispatch` operation.
4. `shell_command` is not subject to a command allowlist. Repository CI policy may constrain workflow source code, but it must not reinterpret the user-supplied authenticated Local Runner shell command as a restricted CI command.
5. Host-tool shims or project-local tool exclusion policies must not be used to limit an explicitly authorized full-host-control shell task. If such a policy exists for other runner modes, the full-control task may enable the tool locally before use.
6. Linux permissions remain authoritative. Root-level operations require the runner account to have passwordless sudo or equivalent host authorization.

## Secret Boundary

Full host control includes permission to read and use local environment files and credentials when necessary for the requested operation. This does **not** authorize secret exfiltration.

- Secret files remain local and must not be committed to Git.
- Secret values must not be copied into request documents.
- Commands should avoid printing credentials into GitHub Actions logs.
- Existing patch/request secret checks remain valid because they prevent secrets from crossing from the host into GitHub; they are not host-access restrictions.

## Filesystem Examples

Host paths include:

- `/home/hesham/`
- `/home/hesham/gova`
- systemd unit locations
- cron state
- local runner runtime directories
- local environment and credential files
- companion-repository clones

Repository paths include:

- `docs/`
- `scripts/`
- `src/`
- `packages/`
- `.github/`

A path being reachable from a Local Runner command does not make that path part of the `gova` repository.

## Operational Invariant

When the user authorizes a Local Runner task, agents must treat the runner as a host-control execution surface rather than a repository-only sandbox. The only standing boundaries are authenticated dispatch, the operating system's actual permissions, and prevention of secret leakage into GitHub. Additional command/path/tool allowlists must not be introduced unless the user explicitly changes this policy.
