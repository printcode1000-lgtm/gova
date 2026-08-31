# Local Server Filesystem Boundary

## Purpose

This document defines the boundary between paths on the local server and paths inside the `gova` Git repository.

## Local Server Paths

Absolute paths under `/home/hesham/` belong to the local server filesystem. They are not repository paths merely because the repository clone or runner infrastructure may live beneath them.

Examples:

- `/home/hesham/`
- `/home/hesham/gova`
- `/home/hesham/gova/.local/`
- local runner installations, worktrees, systemd units, cron state, logs, caches, credentials, and machine-local runtime files stored under the server filesystem

`/home/hesham/gova` is the local filesystem location of a working clone/workspace used by the local runner system. The absolute path itself is not part of the GitHub repository structure and must not be interpreted as a path that exists inside Git.

A file can physically exist beneath `/home/hesham/gova` on the server and still be machine-local, ignored, generated, secret, or otherwise absent from GitHub.

## Repository Paths

Repository paths are paths relative to the Git root and are version-controlled only when tracked by Git.

Examples:

- `docs/`
- `scripts/`
- `src/`
- `packages/`
- `.github/`

When documentation refers to a repository path, it must use the repository-relative form unless the absolute local-server location is specifically relevant.

## Operational Rule

Agents and automation must keep these concepts separate:

1. Absolute `/home/hesham/...` paths describe the local server environment.
2. Repository-relative paths describe content in the `gova` source repository.
3. Local runner directories and local git worktrees are server-side runtime infrastructure, not additional repository directories or GitHub branches.
4. systemd units, cron jobs, local environment files, credentials, runtime state, and other host configuration may exist outside Git even when they operate on the `gova` clone.
5. The existence of a file beneath `/home/hesham/gova` does not prove that the file is tracked or available on GitHub.
6. Before claiming that a local-server artifact is part of the project repository, verify that it is actually tracked in Git.

## Local Runner Context

The local runner executes against the server-hosted workspace located at `/home/hesham/gova`. This location is an environmental deployment detail of the local server. The project source remains the tracked Git repository contents.

Local worktrees created by the runner are filesystem isolation mechanisms on the server. They must not be confused with new remote branches. Remote branch policy is defined separately and remains limited to the repository's recognized branches.

Authenticated full-host-control jobs are not restricted to this workspace path. Their exact authority, verified runtime state, secret boundary, and operational limits are defined in `docs/07-mobile-and-release/local-runner-full-host-control.md`.

## Secrets And Scheduled Host Tasks

Secrets such as local `.env` files, R2 credentials, systemd configuration, cron configuration, and scheduled host tasks must be treated according to their actual storage location. If they exist only on the local server, GitHub inspection alone cannot prove their current state or execution status.

When verifying host-level behavior such as an hourly R2 update, agents must inspect the relevant local server configuration or an explicitly tracked implementation file rather than infer the behavior from repository paths alone.
