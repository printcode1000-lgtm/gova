# Local Runner Full Host Control

## Status

The Gova Local Runner is an authenticated host-control execution surface, not a repository-only sandbox.

As of 2026-08-31, the ChatGPT path is operational through the permanent `agent-request/chatgpt` branch and the self-hosted runner pool. A validated request is dispatched to a Local Runner job, and the supplied `shell_command` is executed through `/bin/bash -lc` with the operating-system authority of the runner account.

This authority is **per dispatched job**. It is not a permanent SSH session, an always-open remote shell, or background control when no Local Runner job is running.

## Verified Runtime Authority

The following state was verified directly on the local server on 2026-08-31 without printing secret contents:

| Capability | Verified state |
|---|---|
| Runner account | `hesham` (`uid=1000`) |
| Host | `hesham-HP-EliteDesk-800-G2-TWR` |
| Passwordless sudo | available with `sudo -n` |
| Root elevation | `sudo -n id -u` returns `0` |
| Root-readable resources | verified without emitting protected file contents |
| Root filesystem write | verified by creating and deleting a root-owned temporary probe under `/var/tmp` |
| `/home/hesham` read access | available |
| `/home/hesham` write access | available |
| `systemctl` | available |
| `apt-get` | available |
| `crontab` | available |
| `ip` / `ss` | available |
| `git` | available |
| `node` / `npm` | available |
| `python3` | available |
| Antigravity | allowed; `/usr/local/bin/antigravity` |
| `agy` | available; `/home/hesham/.local/bin/agy` |
| Docker CLI | not currently available |

The Docker row is an availability fact, not a policy restriction. A tool that is not installed cannot be used until it is installed or otherwise made available.

## Filesystem Boundary

`/home/hesham/` and every absolute path below it are local-server filesystem paths.

`/home/hesham/gova` is the server-hosted Gova clone/workspace used by the Local Runner. It is not a repository-relative path and it is not a security boundary for full-host-control shell jobs.

Repository paths remain relative to the Git root, for example:

- `docs/`
- `scripts/`
- `src/`
- `packages/`
- `.github/`

The Local Runner may `cd` outside `/home/hesham/gova` and operate on other host paths when the authenticated task requires it. A path being reachable by the runner does not make that path part of the Gova repository.

See `docs/07-mobile-and-release/local-server-filesystem-boundary.md` for the filesystem/repository distinction.

## Authentication And Dispatch Boundary

The standing trust boundary is GitHub plus the local operating system:

1. `agent-request/chatgpt` is the permanent ChatGPT request branch.
2. The gateway accepts that branch only; it does not create or delete remote request branches.
3. Request documents are validated before dispatch.
4. Dispatch requests target `main`, use a closed workflow/input contract, are time-limited, and use single-use request IDs.
5. Secret-looking request values and secret-bearing patch targets are rejected before execution.
6. The Local Runner job then executes on a self-hosted runner carrying the `gova` label.
7. Linux permissions remain authoritative once the shell is running; passwordless sudo currently provides root elevation.

The authenticated `shell_command` is intentionally **not subject to a command allowlist**. Repository CI policy may constrain workflow source, but it does not reinterpret the user-supplied Local Runner shell command as a restricted CI command.

## Host-Level Capabilities

Within an authenticated Local Runner job, ChatGPT can request shell operations across the host subject to the kernel, filesystem, installed software, hardware, and network actually available at execution time.

### Files and directories

The shell can:

- read, create, edit, move, copy, and delete files and directories;
- operate outside the Gova workspace;
- inspect file metadata and permissions;
- use `sudo` for root-owned locations;
- change ownership and permissions where the operating system permits;
- inspect local repositories, worktrees, logs, caches, configuration, and runtime state.

### Services and operating-system configuration

With the verified passwordless sudo capability, the shell can perform authorized host administration such as:

- inspect/start/stop/restart/enable/disable systemd services and timers;
- manage system and user units;
- install, upgrade, or remove APT packages;
- inspect and manage cron configuration;
- inspect and manage processes;
- execute root-required maintenance commands;
- edit host configuration files when explicitly required by the task.

### Network and connectivity

Available host tooling allows tasks such as:

- inspect interfaces, routes, addresses, sockets, and listening ports;
- run network diagnostics;
- start or stop local listeners/services;
- alter host networking through the appropriate privileged system commands when explicitly required.

Network success still depends on the actual LAN/WAN, firewall, NAT, permissions, and upstream services.

### Development and automation tooling

The Local Runner can execute installed tooling including:

- Git and repository commands;
- Node.js and npm;
- Python 3;
- shell scripts and arbitrary executables available through the host;
- Antigravity and `agy`, which are currently enabled by the machine-local host-tool policy.

Docker is not currently present on the verified host.

### Local environment and credentials

The host-control shell has sufficient OS authority to read local environment and credential files when an authorized task genuinely requires them. This capability is for **local use**, not export.

## Secret Boundary

Full host authority does not authorize secret exfiltration.

The following remain mandatory:

- secret values must not be committed to Git;
- secret values must not be copied into `.agent-control` request documents;
- secret values must not be posted to coordination messages;
- commands must avoid printing credentials into GitHub Actions logs;
- inspection surfaces that classify a repository path as secret must continue to redact/refuse its content;
- patch-based mutation must continue to reject secret-bearing repository paths.

A Local Runner shell may use a secret locally for an operation while keeping its value on the host.

## Repository Mutation Guardrails

Full host control does not remove the repository's mutation safety model.

For the direct-`main` mutation path:

- mutation jobs share one GitHub concurrency group;
- `GOVA_AGENT_MAX_CONCURRENT_MUTATIONS=1` serializes heavy mutations on the host;
- memory admission can delay/refuse a mutation before it touches work;
- scope locks prevent conflicting Local Runner jobs;
- work happens in an isolated local Git worktree based on fresh `origin/main`;
- a stale-base check refuses to push if `origin/main` moved during the job;
- signals release locks and clean/reconcile worktree state;
- the workflow has a 60-minute job timeout;
- optional built-in verification is limited to the documented verification choices.

These are repository-integrity and host-stability controls. They are not shell command/path allowlists.

## Remote Branch Policy

The repository recognizes exactly two remote branches:

- `main`
- `agent-request/chatgpt`

The active `fixed-two-branches` GitHub ruleset blocks creation of every other remote branch and has no bypass actor.

Local worktrees and local refs may still be used for execution isolation. They are host runtime details, not additional GitHub branches.

Any legacy code path that attempts to publish `codex/**`, `agent-control`, another `agent-request/**`, or any other third remote branch is incompatible with the active ruleset and is not a supported Local Runner delivery path.

## Host Tools

The Local Runner has a machine-local host-tool policy stored under `.local/host-tools.json`.

The policy mechanism can install refusal shims for `antigravity` and `agy` when disabled. The current runtime state was verified as:

- Antigravity policy: allowed
- `antigravity`: `/usr/local/bin/antigravity`
- `agy`: `/home/hesham/.local/bin/agy`

Therefore authenticated full-host-control shell tasks currently have access to those tools.

## Host Discovery

The former Gova relationship to the external `p2p-link` companion repository has been removed from current `main`. Gova no longer owns a companion-repository restore/sync contract for that repository and no Local Runner command depends on it.

Host discovery is now a Gova-owned Local Runner capability:

```bash
npm run local-agent:device:discover
```

It is implemented inside Gova and has no `p2p-link` repository dependency.

Current behavior:

- default TCP port: `48731`;
- password source: `ASOL_DEVICE_DISCOVERY_PORT_PASSWORD`;
- optional port override: `ASOL_DEVICE_DISCOVERY_PORT`;
- optional R2 key override: `ASOL_DEVICE_DISCOVERY_R2_KEY`;
- default R2 object: `host-discovery/<hostname>.json`;
- discovery documents expire after 10 minutes;
- documents contain host/runtime/network facts and URL candidates;
- the password value is never included in the published discovery document;
- `--dry-run` produces the document without R2 publication or a listener;
- `--publish-only` publishes to R2 and exits;
- normal mode publishes to R2 and starts a password-protected HTTP listener on `0.0.0.0:<port>`;
- the listener accepts `x-asol-port-password` or Basic authentication using the configured password.

This is host discovery, not a P2P companion-repository integration.

## Operational Limits

Full Host Control means the authenticated shell is not artificially restricted to repository paths or a command allowlist. It does **not** mean unlimited execution independent of the platform.

Current limits include:

- a Local Runner must be online and accept the job;
- control is job-scoped, not a permanent interactive shell;
- the direct mutation workflow times out after 60 minutes;
- mutation admission and cgroup memory controls protect the host from concurrent heavy work;
- GitHub request validation and the fixed two-branch ruleset remain enforced;
- secret-export protections remain enforced;
- unavailable software cannot be used until installed;
- network operations depend on the actual network and external service availability.

## Operational Invariants

1. Treat the Local Runner as a host-control surface for authenticated tasks, not as a repository sandbox.
2. Treat `/home/hesham/...` as host paths and repository-relative names as Git paths.
3. Do not introduce a command/path allowlist for authenticated full-host-control shell tasks unless the user explicitly changes this policy.
4. Preserve authentication, request validation, secret-export prevention, repository mutation guards, and the fixed two-branch policy.
5. Do not infer host state from GitHub alone when the fact lives only on the server; verify it through the Local Runner.
6. Do not reintroduce a Gova dependency, restore rule, sync command, or documentation contract for the removed `p2p-link` companion relationship unless the user explicitly requests a new architecture.
